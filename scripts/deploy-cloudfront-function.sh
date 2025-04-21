#!/bin/bash

set -euo pipefail

distributionId=$1
functionName=$2
sourceFile=$3

# 1. Create or update -> DEVELOPMENT
if aws cloudfront describe-function --name "$functionName" >/dev/null 2>&1; then
  echo "[CloudFront Function] Updating $functionName"
  etag=$(aws cloudfront describe-function --name "$functionName" \
          --query 'ETag' --output text)
  aws cloudfront update-function \
    --name "$functionName" \
    --if-match "$etag" \
    --function-code "file://$sourceFile" \
    --function-config 'Comment=Lite App Fn,Runtime=cloudfront-js-1.0'
else
  echo "[CloudFront Function] Creating $functionName"
  aws cloudfront create-function \
    --name "$functionName" \
    --function-code "file://$sourceFile" \
    --function-config 'Comment=Lite App Fn,Runtime=cloudfront-js-1.0'
fi

# 2. Publish -> LIVE
liveEtag=$(aws cloudfront describe-function --name "$functionName" \
            --query 'ETag' --output text)
aws cloudfront publish-function --name "$functionName" --if-match "$liveEtag"

# 3. Attach on viewer‑request
funcArn=$(aws cloudfront describe-function --name "$functionName" \
           --query 'FunctionSummary.FunctionMetadata.FunctionARN' --output text)

aws cloudfront get-distribution-config --id "$distributionId" --output json > dist.json
distEtag=$(jq -r '.ETag' dist.json)

# merge / replace viewer‑request association
jq --arg arn "$funcArn" '
  .DistributionConfig.DefaultCacheBehavior.FunctionAssociations
  |= (
       .Items |= (map(select(.EventType!="viewer-request")) + [{EventType:"viewer-request",FunctionARN:$arn}])
       | .Quantity = (.Items | length)
     )
  | .DistributionConfig
' dist.json > dist-updated.json   # <- only the inner object

aws cloudfront update-distribution \
  --id "$distributionId" \
  --if-match "$distEtag" \
  --distribution-config file://dist-updated.json

echo "[CloudFront Function] Attached $functionName ✔"
