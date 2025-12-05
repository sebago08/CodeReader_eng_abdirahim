import type { LayerProgress } from "@shared/schema";

interface SegmentedProgressProps {
  progress: LayerProgress[];
  roadLength: number;
  carriagewaySide?: 'lhs' | 'rhs' | 'both';
  layerId: string;
}

export default function SegmentedProgress({ 
  progress, 
  roadLength, 
  carriagewaySide = 'both',
  layerId 
}: SegmentedProgressProps) {
  // Guard against invalid road length
  if (!Number.isFinite(roadLength) || roadLength <= 0) {
    return (
      <div className="text-xs text-muted-foreground text-center py-2">
        Invalid road length
      </div>
    );
  }
  // Filter progress based on carriageway side and validate numeric chainages
  const filteredProgress = progress.filter(prog => {
    // Normalize carriageway sides to lowercase for comparison
    const progSide = prog.carriagewaySide?.toLowerCase() || 'both';
    const filterSide = carriagewaySide.toLowerCase();
    
    // Check carriageway side (case-insensitive)
    const sideMatch = filterSide === 'both' 
      ? progSide === 'both' || !prog.carriagewaySide
      : progSide === filterSide || progSide === 'both';
    
    // Ensure start and end chainages are valid finite numbers
    const validChainages = Number.isFinite(+prog.startChainage) && Number.isFinite(+prog.endChainage);
    
    return sideMatch && validChainages;
  });

  // Sort progress segments by start chainage
  const sortedProgress = [...filteredProgress].sort((a, b) => 
    Number(a.startChainage) - Number(b.startChainage)
  );

  // Merge overlapping or contiguous segments
  const mergedSegments = sortedProgress.reduce<Array<{ start: number; end: number; qualityStatus: string | null }>>((acc, prog) => {
    const start = Number(prog.startChainage);
    const end = Number(prog.endChainage);
    
    if (acc.length === 0) {
      return [{ start, end, qualityStatus: prog.qualityStatus }];
    }
    
    const lastSegment = acc[acc.length - 1];
    
    // Check if current segment overlaps or is contiguous with the last segment
    if (start <= lastSegment.end) {
      // Merge segments by extending the end if needed
      lastSegment.end = Math.max(lastSegment.end, end);
      return acc;
    } else {
      // Add new segment
      return [...acc, { start, end, qualityStatus: prog.qualityStatus }];
    }
  }, []);

  const getSegmentColor = (qualityStatus?: string | null) => {
    if (!qualityStatus) return 'bg-blue-500';
    
    switch (qualityStatus.toLowerCase()) {
      case 'approved':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const getSegmentPosition = (startChainage: number, endChainage: number) => {
    // Guard against invalid inputs
    if (!Number.isFinite(roadLength) || roadLength <= 0 || !Number.isFinite(startChainage) || !Number.isFinite(endChainage)) {
      return { left: '0%', width: '0%' };
    }
    
    // Clamp values to valid range
    const clampedStart = Math.max(0, Math.min(startChainage, roadLength));
    const clampedEnd = Math.max(clampedStart, Math.min(endChainage, roadLength));
    
    const start = (clampedStart / roadLength) * 100;
    const width = ((clampedEnd - clampedStart) / roadLength) * 100;
    return { left: `${start}%`, width: `${width}%` };
  };

  return (
    <div className="space-y-2">
      {/* Road scale visualization */}
      <div className="relative h-5 bg-muted rounded-md border">
        {/* Road length markers */}
        <div className="absolute inset-0 flex justify-between items-center px-1">
          <span className="text-xs text-muted-foreground font-mono">0km</span>
          <span className="text-xs text-muted-foreground font-mono">{Number.isFinite(roadLength) ? roadLength.toFixed(2) : '0'}km</span>
        </div>
        
        {/* Progress segments */}
        {mergedSegments.map((segment, index) => {
          const position = getSegmentPosition(segment.start, segment.end);
          
          return (
            <div
              key={index}
              className={`absolute h-full ${getSegmentColor(segment.qualityStatus)} rounded-sm border border-white shadow-sm`}
              style={position}
              title={`${segment.start.toFixed(2)}km - ${segment.end.toFixed(2)}km`}
              data-testid={`segment-${layerId}-${index}`}
            />
          );
        })}
      </div>

      {/* Segment details */}
      {mergedSegments.length > 0 && (
        <div className="space-y-1">
          {mergedSegments.map((segment, index) => (
            <div key={index} className="flex items-center text-xs">
              <div className="flex items-center space-x-2">
                <div 
                  className={`w-3 h-3 rounded-sm ${getSegmentColor(segment.qualityStatus)}`}
                  data-testid={`segment-indicator-${layerId}-${index}`}
                />
                <span className="font-mono text-muted-foreground">
                  {segment.start.toFixed(2)}km - {segment.end.toFixed(2)}km
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="flex justify-end items-center text-xs pt-2 border-t border-border">
        <span className="font-medium">
          {sortedProgress.reduce((sum, prog) => {
            const start = Number(prog.startChainage);
            const end = Number(prog.endChainage);
            if (Number.isFinite(start) && Number.isFinite(end)) {
              return sum + (end - start);
            }
            return sum;
          }, 0).toFixed(2)}km completed
        </span>
      </div>
    </div>
  );
}