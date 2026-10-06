import React from 'react';

export const SkeletonPulse: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`animate-pulse bg-white/50 backdrop-blur-sm rounded-2xl ${className}`}></div>
);

export const VehicleCardSkeleton = () => (
  <div className="glass-card rounded-2xl overflow-hidden flex flex-col h-full border border-white/60">
    <div className="w-full aspect-[16/10] bg-gray-200/50 animate-pulse" />
    <div className="p-2 flex-1 flex flex-col space-y-2">
      <SkeletonPulse className="h-4 w-3/4" />
      <SkeletonPulse className="h-2 w-1/2" />
      
      <div className="grid grid-cols-2 gap-1 mt-1 bg-white/30 p-1.5 rounded-lg">
         {[1,2,3,4].map(i => (
             <div key={i}>
                 <SkeletonPulse className="h-1.5 w-1/3 mb-1 bg-gray-300/50" />
                 <SkeletonPulse className="h-2 w-2/3 bg-gray-300/50" />
             </div>
         ))}
      </div>

      <div className="mt-auto pt-1">
         <SkeletonPulse className="h-6 w-full rounded-full" />
      </div>
    </div>
  </div>
);

export const VehicleDetailSkeleton = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      <SkeletonPulse className="h-10 w-48 mb-6 rounded-full" /> 
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           {/* Image */}
           <div className="glass-panel p-2 rounded-[2rem]">
             <div className="h-96 w-full bg-gray-200/50 rounded-[1.5rem]" />
             <div className="flex gap-3 mt-3 p-1">
                {[1,2,3,4].map(i => <div key={i} className="h-20 w-32 bg-gray-200/50 rounded-xl flex-shrink-0" />)}
             </div>
           </div>
           
           {/* Specs */}
           <div className="glass-panel rounded-[2rem] overflow-hidden">
             <div className="bg-white/40 px-8 py-5 border-b border-white/40">
               <SkeletonPulse className="h-7 w-1/3" />
             </div>
             <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
               {[...Array(8)].map((_, i) => (
                 <div key={i} className="flex justify-between border-b border-gray-100/50 pb-2">
                   <SkeletonPulse className="h-4 w-1/4" />
                   <SkeletonPulse className="h-4 w-1/3" />
                 </div>
               ))}
             </div>
           </div>

           {/* AI Section */}
           <div className="glass-panel p-8 rounded-[2rem] space-y-4">
              <SkeletonPulse className="h-8 w-1/3 bg-indigo-100/50" />
              <div className="space-y-3 pt-4">
                  <SkeletonPulse className="h-4 w-full" />
                  <SkeletonPulse className="h-4 w-full" />
                  <SkeletonPulse className="h-4 w-3/4" />
              </div>
           </div>
        </div>

        <div className="space-y-6">
           <div className="glass-panel p-6 rounded-[2rem] sticky top-28">
               <SkeletonPulse className="h-10 w-3/4 mb-4" />
               <div className="flex gap-2 mb-8">
                  <SkeletonPulse className="h-6 w-20 rounded-full" />
                  <SkeletonPulse className="h-6 w-20 rounded-full" />
               </div>
               
               <div className="bg-white/50 p-6 rounded-2xl mb-8 space-y-2">
                   <SkeletonPulse className="h-4 w-1/4" />
                   <SkeletonPulse className="h-12 w-1/2" />
               </div>

               <div className="space-y-4">
                   <SkeletonPulse className="h-14 w-full rounded-2xl" />
                   <SkeletonPulse className="h-12 w-full rounded-2xl" />
               </div>
           </div>
        </div>
      </div>
    </div>
);

export const DashboardSkeleton = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
        <SkeletonPulse className="h-10 w-48 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1,2,3].map(i => (
                <div key={i} className="glass-panel p-6 rounded-[2rem] h-40 flex flex-col justify-between">
                    <SkeletonPulse className="h-5 w-1/2" />
                    <SkeletonPulse className="h-10 w-1/4" />
                    <SkeletonPulse className="h-4 w-1/3" />
                </div>
            ))}
        </div>
        <div className="glass-panel rounded-[2rem] overflow-hidden">
            <div className="bg-white/40 px-6 py-5 border-b border-white/40">
                 <SkeletonPulse className="h-7 w-1/4" />
            </div>
            <div className="p-6 space-y-6">
                {[1,2,3].map(i => (
                     <div key={i} className="flex justify-between items-center p-2">
                        <div className="space-y-2 w-1/2">
                            <SkeletonPulse className="h-5 w-2/3" />
                            <SkeletonPulse className="h-3 w-1/3" />
                        </div>
                        <SkeletonPulse className="h-8 w-24 rounded-full" />
                     </div>
                ))}
            </div>
        </div>
    </div>
);