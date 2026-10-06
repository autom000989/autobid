import React, { useEffect, useState } from 'react';
import { Vehicle, VehicleStatus } from '../types';

interface VehicleCardProps {
  vehicle: Vehicle;
  onClick: (vehicle: Vehicle) => void;
  currentUser?: any;
  t?: any;
}

// Fix: Cast default value of t to any to avoid type inference issues with empty object
export const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onClick, currentUser, t = {} as any }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [displayStatus, setDisplayStatus] = useState<string>(vehicle.status);
  const [badgeColor, setBadgeColor] = useState<string>('bg-blue-600/90');
  const [isAnimate, setIsAnimate] = useState<boolean>(false);
  const [isUpcomingState, setIsUpcomingState] = useState<boolean>(false);

  useEffect(() => {
    const isOwner = Boolean(currentUser && currentUser.id && vehicle.ownerId === currentUser.id);
    const formatDiff = (diffMs: number) => {
      if (diffMs <= 0) return '0m';
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      const pad = (n: number) => n.toString().padStart(2, '0');

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        const remH = hours % 24;
        return `${days}d ${remH}h`;
      }
      if (hours > 0) {
        return `${hours}h ${pad(minutes)}m`;
      }
      return `${pad(minutes)}m ${pad(seconds)}s`;
    };

    const updateStatus = () => {
      const now = Date.now();
      const isUpcoming = (vehicle.startTime && vehicle.startTime > now) || vehicle.status === VehicleStatus.UPCOMING;
      setIsUpcomingState(isUpcoming);

      // Priority 1: Blacklisted
      if (vehicle.status === VehicleStatus.BLACKLISTED || vehicle.isBlacklisted) {
        setDisplayStatus('BLACKLISTED');
        setBadgeColor('bg-zinc-800/90');
        setIsAnimate(false);
        setTimeLeft('Expired (3 Months)');
        return;
      }

      // Priority 2: Direct Sale (Without Auction)
      if (vehicle.listingType === 'direct' || vehicle.status === VehicleStatus.DIRECT_SALE) {
        setDisplayStatus(isOwner ? 'MY SALE' : 'FOR SALE');
        setBadgeColor(isOwner ? 'bg-indigo-600/90' : 'bg-emerald-600/90');
        setIsAnimate(false);
        const expiry = vehicle.expiresAt || vehicle.endTime || (now + 90 * 24 * 60 * 60 * 1000);
        const diffMs = expiry - now;
        if (diffMs <= 0) {
          setTimeLeft('Expired');
        } else {
          const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          setTimeLeft(days > 0 ? `${days}d left` : `${Math.floor(diffMs / (1000 * 60 * 60))}h left`);
        }
        return;
      }

      // Priority 3: Sold/Won/Lost
      if (vehicle.status === VehicleStatus.SOLD) {
        if (vehicle.userBidStatus === 'won') {
          setDisplayStatus(t?.won || 'WON');
          setBadgeColor('bg-green-600/90');
        } else if (vehicle.userBidStatus === 'lost') {
          setDisplayStatus(t?.lost || 'LOST');
          setBadgeColor('bg-gray-600/90');
        } else {
          setDisplayStatus(t?.sold || 'SOLD');
          setBadgeColor('bg-gray-800/90');
        }
        setIsAnimate(false);
        setTimeLeft(t?.ended || 'Auction Ended');
        return;
      }

      if (isUpcoming) {
        setIsAnimate(false);
        setBadgeColor(isOwner ? 'bg-indigo-600/90' : 'bg-blue-600/90');
        setDisplayStatus(isOwner ? 'MY UPCOMING' : 'UPCOMING');
        const startDiff = (vehicle.startTime || now) - now;
        if (startDiff > 0) {
          setTimeLeft(`Starts in ${formatDiff(startDiff)}`);
        } else {
          setTimeLeft('Starting soon');
        }
        return;
      }

      // Check if auction ended
      const endDiff = vehicle.endTime - now;
      if (endDiff <= 0) {
        setDisplayStatus(vehicle.userBidStatus === 'won' ? 'WON' : vehicle.userBidStatus === 'lost' ? 'LOST' : 'ENDED');
        setBadgeColor('bg-gray-800/90');
        setIsAnimate(false);
        setTimeLeft('Auction Ended');
        return;
      }

      // Live Auction
      setIsAnimate(true);
      setBadgeColor(isOwner ? 'bg-indigo-600/90' : 'bg-red-600/90');
      setDisplayStatus(isOwner ? 'MY LIVE' : (t?.liveAuctions || 'LIVE'));
      setTimeLeft(formatDiff(endDiff));
    };

    updateStatus();
    const timer = setInterval(updateStatus, 1000);
    return () => clearInterval(timer);
  }, [vehicle, currentUser?.id, t]);

  return (
    <div 
      className="glass-card rounded-xl overflow-hidden flex flex-col cursor-pointer h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md group border border-slate-200/90"
      onClick={() => onClick(vehicle)}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900/5">
        <img 
          src={vehicle.images && vehicle.images.length > 0 ? (vehicle.coverImageIndex !== undefined && vehicle.images[vehicle.coverImageIndex] ? vehicle.images[vehicle.coverImageIndex] : vehicle.images[0]) : `https://picsum.photos/id/${vehicle.imageSeed}/1200/800`} 
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} 
          loading="lazy"
          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60"></div>
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
           <span className={`px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider rounded-md text-white shadow-xs backdrop-blur-md border border-white/20 ${badgeColor} ${isAnimate ? 'animate-pulse' : ''}`}>
             {displayStatus}
           </span>
           {vehicle.hasRegistrationCard && (
             <span className="px-1.5 py-0.5 text-[8px] font-extrabold uppercase rounded-md text-emerald-100 bg-emerald-700/90 shadow-xs backdrop-blur-md border border-emerald-400/30 flex items-center gap-0.5" title="Registration Card (RC) Available">
               <span>✓</span> RC
             </span>
           )}
        </div>
        {vehicle.upcomingBids && vehicle.upcomingBids.length > 0 && isUpcomingState && (
          <div className="absolute top-1.5 right-1.5 bg-blue-600/85 backdrop-blur-md text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md shadow-xs border border-white/20">
            {vehicle.upcomingBids.length} Pre-Bids
          </div>
        )}
        <div className="absolute bottom-1.5 right-1.5 bg-black/50 backdrop-blur-md text-white text-[8.5px] font-medium px-1.5 py-0.5 rounded-md shadow-xs border border-white/10">
          {vehicle.odometer.toLocaleString()} mi
        </div>
      </div>

      <div className="p-2 flex-1 flex flex-col relative bg-white">
        <div className="absolute -top-3.5 right-2 bg-white rounded-md px-1.5 py-0.5 shadow-sm border border-gray-100 min-w-[2.75rem]">
             <div className="text-[6.5px] text-gray-400 font-bold uppercase text-center leading-none">
               {vehicle.listingType === 'direct' || vehicle.status === VehicleStatus.DIRECT_SALE ? 'PRICE' : isUpcomingState ? 'ASKING' : 'BID'}
             </div>
             <div className="text-gray-900 font-extrabold text-[11px] leading-tight text-center">
               ₹{((vehicle.directPrice || vehicle.currentBid || vehicle.startingPrice || 0)/1000).toFixed(1)}k
             </div>
        </div>

        <h3 className="text-xs font-bold text-gray-900 leading-snug mb-0.5 group-hover:text-red-600 transition-colors pr-11 truncate">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </h3>
        <p className="text-[8.5px] text-gray-400 mb-1.5 font-medium tracking-tight">{t?.vin || 'VIN'}: {vehicle.vin}</p>
        
        <div className="grid grid-cols-2 gap-y-0.5 gap-x-1 text-[8.5px] mb-2 bg-gray-50/80 rounded-md p-1 border border-gray-100">
          <div>
            <span className="block text-gray-400 text-[7.5px] uppercase font-semibold">Damage</span>
            <span className="font-semibold text-gray-700 truncate block">{vehicle.primaryDamage}</span>
          </div>
          <div>
            <span className="block text-gray-400 text-[7.5px] uppercase font-semibold">Retail Est.</span>
            <span className="font-semibold text-gray-700 block">₹{(vehicle.estRetailValue/1000).toFixed(0)}k</span>
          </div>
          <div className="col-span-2">
            <span className="block text-gray-400 text-[7.5px] uppercase font-semibold">Location</span>
            <span className="font-semibold text-gray-700 truncate block">{vehicle.location}</span>
          </div>
        </div>

        <div className="mt-auto">
          <div className="flex justify-between items-center bg-gray-50 rounded-md px-1.5 py-0.5 border border-gray-100">
            <span className="text-gray-500 text-[8.5px] font-medium">{isUpcomingState ? 'Schedule' : vehicle.status === VehicleStatus.SOLD ? (t?.saleStatus || 'Status') : (t?.timeLeft || 'Ends in')}</span>
            <span className={`font-mono font-bold text-[9px] ${isAnimate ? 'text-red-600' : isUpcomingState ? 'text-blue-600' : 'text-gray-700'}`}>
              {timeLeft}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};