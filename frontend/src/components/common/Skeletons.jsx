import React from 'react';
import Panel from '../app/Panel';

// Base pulse block with high visibility contrast on dark panels
export const SkeletonBlock = ({ className = '', style = {} }) => (
    <div
        style={style}
        className={`animate-pulse rounded-md bg-white/[0.12] border border-white/[0.05] ${className}`}
    />
);

// Stat Card Skeleton
export const StatCardSkeleton = ({ count = 4 }) => (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {[...Array(count)].map((_, i) => (
            <Panel key={i} className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                    <SkeletonBlock className="h-3 w-16" />
                    <SkeletonBlock className="h-4 w-4 rounded-full" />
                </div>
                <SkeletonBlock className="mt-3 h-7 w-20" />
                <SkeletonBlock className="mt-2 h-3 w-28" />
            </Panel>
        ))}
    </div>
);

// Home Overview Panel Skeleton
export const HomeOverviewSkeleton = () => (
    <div className="space-y-4">
        <StatCardSkeleton count={4} />
        <Panel className="p-6">
            <div className="flex items-center justify-between pb-4">
                <div className="space-y-2">
                    <SkeletonBlock className="h-4 w-36" />
                    <SkeletonBlock className="h-3 w-48" />
                </div>
                <SkeletonBlock className="h-8 w-24 rounded-full" />
            </div>
            <div className="mt-4 flex h-48 items-end gap-3 pt-6 border-t border-panel-border">
                {[40, 65, 30, 85, 50, 75, 90, 45, 60, 80, 55, 70].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <SkeletonBlock className="w-full" style={{ height: `${h}%` }} />
                        <SkeletonBlock className="h-2 w-6" />
                    </div>
                ))}
            </div>
        </Panel>
    </div>
);

// Home Tools Panel Skeleton
export const HomeToolsSkeleton = () => (
    <Panel className="p-6">
        <div className="grid grid-cols-1 divide-y divide-panel-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {/* Col 1: Rising Resistance */}
            <div className="space-y-3 sm:pr-6">
                <div className="flex items-center gap-2">
                    <SkeletonBlock className="h-4 w-4 rounded-full" />
                    <SkeletonBlock className="h-4 w-32" />
                </div>
                <div className="rounded-[10px] bg-white/[0.05] p-3 space-y-2">
                    <SkeletonBlock className="h-5 w-20" />
                    <SkeletonBlock className="h-3 w-36" />
                </div>
            </div>

            {/* Col 2: Prediction Journey */}
            <div className="space-y-3 py-4 sm:px-6 sm:py-0">
                <SkeletonBlock className="h-4 w-32" />
                <div className="flex items-center gap-2 pt-1">
                    {[...Array(4)].map((_, i) => (
                        <SkeletonBlock key={i} className="h-6 w-14 rounded-full" />
                    ))}
                </div>
            </div>

            {/* Col 3: Dataset Coverage */}
            <div className="space-y-3 pt-4 sm:pl-6 sm:pt-0">
                <SkeletonBlock className="h-4 w-32" />
                <div className="grid grid-cols-3 gap-2 pt-1">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="space-y-1">
                            <SkeletonBlock className="h-5 w-10" />
                            <SkeletonBlock className="h-2.5 w-12" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </Panel>
);

// Dataset Explorer Skeleton
export const DatasetExplorerSkeleton = () => (
    <div className="space-y-6">
        <StatCardSkeleton count={4} />

        <div className="flex justify-center my-4">
            <SkeletonBlock className="h-10 w-80 rounded-full" />
        </div>

        <Panel className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <SkeletonBlock className="h-5 w-48" />
                <SkeletonBlock className="h-8 w-32 rounded-full" />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-4">
                    <SkeletonBlock className="h-4 w-32" />
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                            <SkeletonBlock className="h-3 w-28" />
                            <SkeletonBlock className="h-3 w-full max-w-[140px]" />
                            <SkeletonBlock className="h-3 w-10" />
                        </div>
                    ))}
                </div>

                <div className="flex flex-col items-center justify-center p-6 border border-panel-border rounded-xl">
                    <SkeletonBlock className="h-36 w-36 rounded-full mb-4" />
                    <div className="flex gap-4">
                        <SkeletonBlock className="h-3 w-16" />
                        <SkeletonBlock className="h-3 w-16" />
                        <SkeletonBlock className="h-3 w-16" />
                    </div>
                </div>
            </div>
        </Panel>
    </div>
);

// Trends Page Chart Skeleton (Fits inside Trends chart container)
export const TrendsSkeleton = () => (
    <div className="relative h-64 border-b border-l border-white/10 pt-6 pb-2 px-2 flex items-end justify-between gap-3">
        {[25, 45, 35, 65, 50, 75, 60, 85, 70, 90, 80, 95].map((val, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <SkeletonBlock className="w-full rounded-t-sm" style={{ height: `${val}%` }} />
                <SkeletonBlock className="h-2.5 w-6" />
            </div>
        ))}
    </div>
);

// Research Papers Skeleton
export const ResearchPapersSkeleton = () => (
    <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-2">
                <SkeletonBlock className="h-4 w-3/4" />
                <SkeletonBlock className="h-3 w-1/2" />
                <div className="flex gap-2 pt-1">
                    <SkeletonBlock className="h-3 w-16 rounded-full" />
                    <SkeletonBlock className="h-3 w-20 rounded-full" />
                </div>
            </div>
        ))}
    </div>
);

// Explain Trend Drawer Skeleton
export const ExplainTrendSkeleton = () => (
    <div className="space-y-4 p-4">
        <SkeletonBlock className="h-6 w-3/4" />
        <SkeletonBlock className="h-4 w-full" />
        <SkeletonBlock className="h-4 w-5/6" />
        <SkeletonBlock className="h-4 w-2/3" />
        <div className="pt-4 space-y-3">
            <SkeletonBlock className="h-20 w-full rounded-xl" />
            <SkeletonBlock className="h-20 w-full rounded-xl" />
        </div>
    </div>
);
