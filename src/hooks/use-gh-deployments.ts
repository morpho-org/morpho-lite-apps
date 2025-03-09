import { useQuery } from "@tanstack/react-query";

import { Octokit as OctokitBase } from "@octokit/rest";
import { retry } from "@octokit/plugin-retry";
const Octokit = OctokitBase.plugin(retry);

export function useGhDeployments({
  owner,
  repo,
  environment,
  per_page,
  page,
}: {
  owner: string;
  repo: string;
  environment: string;
  per_page?: number;
  page?: number;
}) {
  return useQuery({
    queryKey: ["useGhIpfsDeployments", owner, repo, environment, per_page, page],
    queryFn: async () => {
      const octokit = new Octokit();

      // Fetch all deployments in the given repo/environment, and sort by `updated_at` (newest to oldest)
      const deployments = (await octokit.rest.repos.listDeployments({ owner, repo, environment, per_page, page })).data;
      deployments.sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at));

      // Fetch latest status for each deployment, which includes a log URL and the output/artifcat URL
      const statuses = await Promise.all(
        deployments.map(async (deployment) => {
          return (
            await octokit.rest.repos.listDeploymentStatuses({
              owner,
              repo,
              deployment_id: deployment.id,
              per_page: 1,
              page: 1,
            })
          )?.data?.at(0);
        }),
      );

      // Merge each deployment with its corresponding status
      const deploymentUrls = deployments.map((deployment, idx) => {
        const status = statuses[idx];

        return {
          created_at: deployment.created_at,
          updated_at: deployment.updated_at,
          environment: deployment.environment,
          id: deployment.id,
          ref: deployment.ref,
          sha: deployment.sha,
          log_url: status?.log_url,
          environment_url: status?.environment_url,
          status: status?.state,
        };
      });

      return deploymentUrls;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
