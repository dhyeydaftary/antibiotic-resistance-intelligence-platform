import React from 'react';

const HistorySkeleton = () => {
  return (
    <div className="animate-pulse">
      {/* Stats Skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-paper border border-ink/10 rounded-xl px-4 py-3.5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="w-16 h-3 bg-ink/5 rounded" />
                <div className="w-12 h-6 mt-1.5 bg-ink/5 rounded" />
              </div>
              <div className="w-5 h-5 bg-ink/5 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Filters Skeleton */}
      <div className="mb-8">
        <div className="mb-4">
          <div className="w-full h-12 bg-ink/5 rounded-lg" />
        </div>
        <div className="flex flex-wrap gap-3">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="w-32 h-9 bg-ink/5 rounded-lg" />
          ))}
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-paper border border-ink/10 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-ink/10">
          <div className="grid grid-cols-12 gap-3">
            {[...Array(8)].map((_, index) => (
              <div key={index} className={`h-3 bg-ink/5 rounded ${
                index === 0 ? 'col-span-1' :
                index === 1 ? 'col-span-2' :
                index === 2 ? 'col-span-2' :
                index === 3 ? 'col-span-2' :
                index === 4 ? 'col-span-2' :
                index === 5 ? 'col-span-1' :
                index === 6 ? 'col-span-1' :
                'col-span-1'
              }`} />
            ))}
          </div>
        </div>

        {[...Array(5)].map((_, index) => (
          <div key={index} className="px-5 py-3 border-b border-ink/5 last:border-b-0">
            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-1">
                <div className="w-6 h-4 bg-ink/5 rounded" />
              </div>
              <div className="col-span-2">
                <div className="w-16 h-4 bg-ink/5 rounded" />
                <div className="w-12 h-3 mt-1 bg-ink/5 rounded" />
              </div>
              <div className="col-span-2">
                <div className="w-24 h-4 bg-ink/5 rounded" />
              </div>
              <div className="col-span-2">
                <div className="w-20 h-4 bg-ink/5 rounded" />
              </div>
              <div className="col-span-2">
                <div className="w-16 h-4 bg-ink/5 rounded" />
              </div>
              <div className="col-span-1 text-center">
                <div className="w-12 h-5 bg-ink/5 rounded-full mx-auto" />
              </div>
              <div className="col-span-1">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-12 h-1.5 bg-ink/5 rounded-full" />
                  <div className="w-8 h-3 bg-ink/5 rounded" />
                </div>
              </div>
              <div className="col-span-1 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <div className="w-1.5 h-1.5 bg-ink/5 rounded-full" />
                  <div className="w-12 h-3 bg-ink/5 rounded" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Skeleton */}
      <div className="flex justify-between items-center mt-6">
        <div className="w-40 h-4 bg-ink/5 rounded" />
        <div className="flex items-center gap-1">
          <div className="w-20 h-8 bg-ink/5 rounded-lg" />
          {[...Array(4)].map((_, index) => (
            <div key={index} className="w-8 h-8 bg-ink/5 rounded-lg" />
          ))}
          <div className="w-20 h-8 bg-ink/5 rounded-lg" />
        </div>
      </div>
    </div>
  );
};

export default HistorySkeleton;