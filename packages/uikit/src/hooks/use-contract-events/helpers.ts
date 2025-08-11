import { type BlockNumber } from "viem";
/**
 * A missing segment, with an indicator:
 * - isGap: true if the segment fills in a gap between known ranges;
 *          false if it extends the known data (i.e. to newer blocks).
 */
type RemainingSegment = {
  fromBlock: BlockNumber;
  toBlock: BlockNumber;
  isGap: boolean;
};

/**
 * Given a required range, a map of known ranges, and a maximum number of blocks per range,
 * returns an array of missing segments. Each segment includes:
 * - the fromBlock and toBlock of the missing segment, and
 * - a boolean flag: true if the segment fills in a gap between known data,
 *   or false if it extends to newer blocks.
 *
 * Notes:
 * - Any missing segment between two known ranges (or before the first known range) is treated as a gap.
 * - A missing segment at the tail end of the required range (after the last known range) is considered an extension.
 * - If there is no known data, the entire required range is treated as an extension.
 *
 * @param requiredRange - The full range [start, end] that is required.
 * @param knownRanges - A Map where each key is a start block and the value is the end block.
 * @param maxNumBlocks - A bigint representing the maximum size of each remaining segment,
 *   or the string "unconstrained" to indicate no limit.
 * @returns An array of RemainingSegment objects.
 */
export function getRemainingSegments(
  requiredRange: readonly [BlockNumber, BlockNumber],
  knownRanges: Map<BlockNumber, BlockNumber>,
  maxNumBlocks: bigint | "unconstrained",
  maxNumSegments: number = Infinity,
): RemainingSegment[] {
  const [requiredStart, requiredEnd] = requiredRange;

  if (requiredStart > requiredEnd) {
    throw new Error(`Invalid requiredRange: start is greater than end, ${requiredRange}`);
  }

  // Filter and clip known ranges that intersect the required range.
  const sortedKnownRanges: [BlockNumber, BlockNumber][] = [];
  for (const [start, end] of knownRanges.entries()) {
    // Skip ranges completely outside the required range.
    if (end < requiredStart || start > requiredEnd) continue;
    // Clip the range to the required boundaries.
    const clippedStart = start < requiredStart ? requiredStart : start;
    const clippedEnd = end > requiredEnd ? requiredEnd : end;
    sortedKnownRanges.push([clippedStart, clippedEnd]);
  }

  // Sort ranges by start (and then by end).
  sortedKnownRanges.sort((a, b) => {
    if (a[0] !== b[0]) return a[0] < b[0] ? -1 : 1;
    return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0;
  });

  // Merge overlapping or contiguous known ranges.
  const mergedRanges: [BlockNumber, BlockNumber][] = [];
  for (const range of sortedKnownRanges) {
    if (mergedRanges.length === 0) {
      mergedRanges.push(range);
    } else {
      const lastRange = mergedRanges[mergedRanges.length - 1];
      // If the current range starts before or exactly after the last range ends (contiguous), merge them.
      if (range[0] <= lastRange[1] + BigInt(1)) {
        lastRange[1] = range[1] > lastRange[1] ? range[1] : lastRange[1];
      } else {
        mergedRanges.push(range);
      }
    }
  }

  const remainingSegments: RemainingSegment[] = [];
  let current = requiredStart;

  // Process gaps between merged known ranges.
  for (const [knownStart, knownEnd] of mergedRanges) {
    if (current < knownStart) {
      // There is a missing segment from 'current' up to just before the known range starts.
      // We consider these as gaps (filling in missing historical data).
      addMissingRange(current, knownStart - BigInt(1), maxNumBlocks, true, remainingSegments, maxNumSegments);
    }
    // Move the pointer to the block after this known range.
    if (knownEnd + BigInt(1) > current) {
      current = knownEnd + BigInt(1);
    }

    if (remainingSegments.length === maxNumSegments) break;
  }
  // Process any missing segment after the last known range.
  if (remainingSegments.length < maxNumSegments && current <= requiredEnd) {
    // Missing segment at the tail is considered as extending to newer blocks.
    addMissingRange(current, requiredEnd, maxNumBlocks, false, remainingSegments, maxNumSegments);
  }

  return remainingSegments;
}

/**
 * Splits the gap [start, end] into chunks no larger than maxNumBlocks (if constrained)
 * and pushes each chunk into the provided segments array.
 *
 * @param start - The starting block of the gap.
 * @param end - The ending block of the gap.
 * @param maxNumBlocks - The maximum size allowed for each chunk, or "unconstrained".
 * @param isGap - Boolean indicator: true for gaps, false for extension.
 * @param segments - The array to append the resulting RemainingSegment objects to.
 */
function addMissingRange(
  start: BlockNumber,
  end: BlockNumber,
  maxNumBlocks: bigint | "unconstrained",
  isGap: boolean,
  segments: RemainingSegment[],
  maxNumSegments: number = Infinity,
): void {
  if (maxNumBlocks === "unconstrained") {
    segments.push({ fromBlock: start, toBlock: end, isGap });
  } else {
    let chunkStart = start;
    while (chunkStart <= end) {
      // Determine the end of the current chunk.
      const potentialChunkEnd = chunkStart + maxNumBlocks - BigInt(1);
      const chunkEnd = potentialChunkEnd <= end ? potentialChunkEnd : end;
      segments.push({ fromBlock: chunkStart, toBlock: chunkEnd, isGap });
      chunkStart = chunkEnd + BigInt(1);

      if (segments.length === maxNumSegments) break;
    }
  }
}
