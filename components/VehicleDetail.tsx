import React, { useState, useEffect } from 'react';
import { Vehicle, User } from '../types';
import { generateVehicleAnalysis } from '../services/geminiService';
import { IdentityVerificationModal } from './IdentityVerificationModal';

interface VehicleDetailProps {
  vehicle: Vehicle;
  onBack: () => void;
  onPlaceBid: (amount: number) => void;
  onPlaceUpcomingBid?: () => void;
  onMarkSold?: () => void;
  onConvertToDirectSale?: (vehicleId: string, directPrice: number) => void;
  currentUser?: User;
  t: any;
  onViewProfile?: (user: User) => void;
  onFollowToggle?: (user: User) => void;
  allUsers?: User[];
  isFollowLoading?: boolean;
}

export const VehicleDetail: React.FC<VehicleDetailProps> = ({ 
  vehicle, 
  onBack, 
  onPlaceBid, 
  onPlaceUpcomingBid,
  onMarkSold, 
  onConvertToDirectSale,
  currentUser, 
  t,
  onViewProfile,
  onFollowToggle,
  allUsers,
  isFollowLoading = false
}) => {
  const [bidAmount, setBidAmount] = useState<number>(vehicle.currentBid + 100);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showDirectShiftModal, setShowDirectShiftModal] = useState(false);
  const [newDirectPrice, setNewDirectPrice] = useState<number>(
    vehicle.directPrice || vehicle.startingPrice || vehicle.currentBid || 100000
  );
  const [currentTimeLeft, setCurrentTimeLeft] = useState<string>('');
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showRcModal, setShowRcModal] = useState(false);

  const now = Date.now();
  const isDirectSale = vehicle.listingType === 'direct' || vehicle.status === 'Direct Sale' || (vehicle.status as any) === 'Direct Sale';
  const isBlacklisted = vehicle.status === 'Blacklisted' || vehicle.isBlacklisted;
  const isUpcoming = !isDirectSale && ((vehicle.startTime && vehicle.startTime > now) || vehicle.status === 'Upcoming');
  const isEnded = !isDirectSale && (vehicle.status === 'Sold' || (!isUpcoming && vehicle.endTime <= now));
  const isLive = !isDirectSale && !isUpcoming && !isEnded;
  const isOwner = Boolean(currentUser && currentUser.id && vehicle.ownerId === currentUser.id);
  const isUnsoldAuction = !isDirectSale && isEnded && vehicle.status !== 'Sold' && (!vehicle.winningUserId || vehicle.currentBid === vehicle.startingPrice);

  const sellerUser: User | undefined = allUsers?.find(u => 
    (vehicle.ownerId && u.id === vehicle.ownerId) || 
    (vehicle.ownerUsername && (u.username || '').toLowerCase() === vehicle.ownerUsername.toLowerCase())
  );

  const isFollowingSeller = Boolean(
    currentUser?.followingIds && (
      (vehicle.ownerId && currentUser.followingIds.includes(vehicle.ownerId)) ||
      (sellerUser?.id && currentUser.followingIds.includes(sellerUser.id))
    )
  );

  const sellerFollowsMe = Boolean(
    (sellerUser?.followingIds && currentUser?.id && sellerUser.followingIds.includes(currentUser.id)) ||
    (currentUser?.followersIds && (
      (vehicle.ownerId && currentUser.followersIds.includes(vehicle.ownerId)) ||
      (sellerUser?.id && currentUser.followersIds.includes(sellerUser.id))
    ))
  );

  const resolvedSeller: User = sellerUser || {
    id: vehicle.ownerId || 'seller_' + (vehicle.ownerUsername || 'user'),
    username: vehicle.ownerUsername || 'seller',
    fullName: vehicle.ownerUsername ? `@${vehicle.ownerUsername}` : 'Vehicle Seller',
    avatarUrl: `https://i.pravatar.cc/150?u=${vehicle.ownerUsername || vehicle.ownerId || 'seller'}`,
    followers: 0,
    following: 0,
    bio: 'Vehicle Seller on AutoBid'
  };

  const askingPrice = vehicle.startingPrice || vehicle.currentBid;
  const upcomingBids = vehicle.upcomingBids || [];
  const lastPreBidder = upcomingBids.length > 0 ? upcomingBids[upcomingBids.length - 1] : null;
  const hasUserPreBid = currentUser ? upcomingBids.some(b => b.userId === currentUser.id) : false;
  const isUserLeadingPreBid = lastPreBidder && currentUser && lastPreBidder.userId === currentUser.id;

  const galleryImages = (vehicle.images && vehicle.images.length > 0)
    ? vehicle.images
    : [0, 1, 2, 3].map((i) => `https://picsum.photos/id/${vehicle.imageSeed + i}/1200/800`);

  const initialCover = (vehicle.images && vehicle.images.length > 0)
    ? (vehicle.coverImageIndex !== undefined && vehicle.images[vehicle.coverImageIndex] ? vehicle.images[vehicle.coverImageIndex] : vehicle.images[0])
    : galleryImages[0];

  const [mainImage, setMainImage] = useState<string>(initialCover);

  useEffect(() => {
    const cover = (vehicle.images && vehicle.images.length > 0)
      ? (vehicle.coverImageIndex !== undefined && vehicle.images[vehicle.coverImageIndex] ? vehicle.images[vehicle.coverImageIndex] : vehicle.images[0])
      : `https://picsum.photos/id/${vehicle.imageSeed}/1200/800`;
    setMainImage(cover);
    setBidAmount(vehicle.currentBid + 100);
  }, [vehicle]);

  const currentImageIndex = Math.max(0, galleryImages.indexOf(mainImage));

  const handlePrevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextIdx = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
    setMainImage(galleryImages[nextIdx]);
  };

  const handleNextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextIdx = (currentImageIndex + 1) % galleryImages.length;
    setMainImage(galleryImages[nextIdx]);
  };

  useEffect(() => {
    const formatDiff = (diffMs: number) => {
      if (diffMs <= 0) return '0m 0s';
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      const pad = (n: number) => n.toString().padStart(2, '0');

      if (days > 0) return `${days}d ${hours}h ${pad(minutes)}m`;
      if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
      return `${pad(minutes)}m ${pad(seconds)}s`;
    };

    const updateTimer = () => {
      const currentNow = Date.now();
      if (isEnded) {
        setCurrentTimeLeft('Auction Ended');
      } else if (isUpcoming) {
        const diff = (vehicle.startTime || currentNow) - currentNow;
        setCurrentTimeLeft(diff > 0 ? `Starts in ${formatDiff(diff)}` : 'Starting now...');
      } else {
        const diff = vehicle.endTime - currentNow;
        setCurrentTimeLeft(diff > 0 ? formatDiff(diff) : 'Ended');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [vehicle, isUpcoming, isEnded]);

  const handleGenerateAnalysis = async () => {
    setIsLoadingAnalysis(true);
    const result = await generateVehicleAnalysis(vehicle);
    setAnalysis(result);
    setIsLoadingAnalysis(false);
  };

  const handleBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bidAmount <= vehicle.currentBid) {
      alert(`Your bid must be higher than the current bid of ₹${vehicle.currentBid.toLocaleString()}`);
      return;
    }
    if (currentUser && vehicle.ownerId && vehicle.ownerId === currentUser.id) {
      alert("You cannot place bids on your own vehicle listing.");
      return;
    }
    // Gated check: only verified users can bid!
    if (currentUser && !currentUser.isVerified) {
      setShowVerificationModal(true);
      return;
    }
    // Ask one more time to confirm the bid
    setShowBidModal(true);
  };

  const handleConfirmBid = () => {
    setShowBidModal(false);
    onPlaceBid(bidAmount);
  };

  const handleUpcomingBidClick = () => {
    if (currentUser && vehicle.ownerId && vehicle.ownerId === currentUser.id) {
      alert("You cannot place bids on your own vehicle listing.");
      return;
    }
    if (currentUser && !currentUser.isVerified) {
      setShowVerificationModal(true);
      return;
    }
    if (onPlaceUpcomingBid) {
      onPlaceUpcomingBid();
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
      {/* Breadcrumb / Back */}
      <button onClick={onBack} className="group flex items-center text-gray-600 hover:text-red-600 mb-4 font-semibold text-xs transition-colors bg-white/70 px-3 py-1.5 rounded-lg w-max border border-gray-200/80 backdrop-blur-sm hover:shadow-xs">
        <span className="mr-1.5 group-hover:-translate-x-1 transition-transform">←</span> {t.backToSearch}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left Column: Images & Details */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Main Gallery */}
          <div className="glass-panel p-2.5 rounded-2xl bg-white shadow-sm border border-gray-200/80">
            <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] min-h-[300px] sm:min-h-[420px] bg-slate-950 rounded-xl overflow-hidden shadow-inner flex items-center justify-center group select-none">
              {/* Soft ambient blur backdrop so letterboxing on non-standard aspect ratios is sleek */}
              <img 
                src={mainImage} 
                alt="Ambient vehicle backdrop" 
                className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-35 scale-110 pointer-events-none" 
              />

              {/* Main Image: object-contain by default guarantees 100% of the vehicle is visible without any cropping */}
              <img 
                src={mainImage} 
                className={`relative z-10 w-full h-full transition-all duration-300 cursor-pointer ${
                  fitMode === 'contain' ? 'object-contain' : 'object-cover object-center'
                }`} 
                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} 
                onClick={() => setIsLightboxOpen(true)}
              />

              {/* Top Controls Overlay */}
              <div className="absolute top-2.5 left-2.5 right-2.5 z-20 flex items-center justify-between pointer-events-none">
                <span className="pointer-events-auto bg-black/60 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-white/10 shadow-xs">
                  {currentImageIndex + 1} / {galleryImages.length} Photos
                </span>
                <div className="pointer-events-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFitMode(fitMode === 'contain' ? 'cover' : 'contain')}
                    title={fitMode === 'contain' ? 'Fill screen' : 'Show full uncropped image'}
                    className="bg-black/60 hover:bg-black/85 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-white/15 transition flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    {fitMode === 'contain' ? (
                      <>
                        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                        <span>Fit (100% Full)</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 9h6m-6 6h6m-3-9v12" />
                        </svg>
                        <span>Fill View</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLightboxOpen(true)}
                    title="Open Fullscreen Lightbox"
                    className="bg-black/60 hover:bg-black/85 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-white/15 transition flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                    <span>Enlarge</span>
                  </button>
                </div>
              </div>

              {/* Prev / Next Arrows */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/55 hover:bg-black/85 backdrop-blur-sm text-white flex items-center justify-center transition border border-white/15 shadow-md opacity-80 hover:opacity-100 cursor-pointer"
                    aria-label="Previous Image"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/55 hover:bg-black/85 backdrop-blur-sm text-white flex items-center justify-center transition border border-white/15 shadow-md opacity-80 hover:opacity-100 cursor-pointer"
                    aria-label="Next Image"
                  >
                    ›
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails Row */}
            <div className="flex gap-2 mt-2.5 overflow-x-auto p-0.5 pb-1">
              {galleryImages.map((imgUrl, i) => (
                <div
                  key={i}
                  onClick={() => setMainImage(imgUrl)}
                  className={`relative h-16 w-24 rounded-lg overflow-hidden border-2 cursor-pointer transition-all shadow-xs shrink-0 bg-slate-900 ${
                    mainImage === imgUrl ? 'border-red-500 ring-2 ring-red-400/40 opacity-100' : 'border-transparent opacity-75 hover:opacity-100 hover:border-gray-400'
                  }`}
                >
                  <img 
                    src={imgUrl} 
                    className="w-full h-full object-cover" 
                    alt={`Thumbnail ${i + 1}`} 
                  />
                  <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[8px] font-bold px-1 rounded">
                    {i + 1}
                  </span>
                </div>
              ))}

              {/* If vehicle has an uploaded RC Card, show a dedicated inspectable thumbnail */}
              {vehicle.rcCardUrl && (
                <div
                  onClick={() => setShowRcModal(true)}
                  className="relative h-16 w-24 rounded-lg overflow-hidden border-2 border-emerald-500/70 bg-emerald-950/20 cursor-pointer transition-all shadow-xs shrink-0 group hover:ring-2 hover:ring-emerald-400"
                  title="View Registration Card"
                >
                  <img 
                    src={vehicle.rcCardUrl} 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" 
                    alt="RC Card Thumbnail" 
                  />
                  <div className="absolute inset-0 bg-emerald-950/40 flex items-center justify-center">
                    <span className="bg-emerald-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-0.5">
                      <span>📄</span> RC
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Seller / Lister Profile Banner */}
          {vehicle.ownerUsername && (
            <div className="glass-panel rounded-xl p-4 flex items-center justify-between gap-3 border border-indigo-100 bg-gradient-to-r from-white via-indigo-50/30 to-blue-50/20 shadow-xs">
              <div 
                onClick={() => onViewProfile && onViewProfile(resolvedSeller)}
                className="flex items-center gap-3 cursor-pointer group flex-1 min-w-0"
              >
                <img 
                  src={resolvedSeller.avatarUrl} 
                  alt={vehicle.ownerUsername}
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs group-hover:scale-105 transition-transform shrink-0" 
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                      @{vehicle.ownerUsername}
                    </span>
                    {resolvedSeller.isVerified && (
                      <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                    {sellerFollowsMe && (
                      <span className="text-[9px] bg-blue-100/80 text-blue-700 font-semibold px-1.5 py-0.5 rounded-md border border-blue-200">
                        Follows you
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 truncate">
                    {resolvedSeller.fullName} • {resolvedSeller.followers || 0} followers
                  </p>
                  <span className="text-[10px] text-indigo-600 font-semibold group-hover:underline flex items-center gap-1 mt-0.5">
                    View profile & listed vehicles →
                  </span>
                </div>
              </div>

              {/* Follow / Follow-Back Button */}
              {!isOwner && onFollowToggle && (
                <button
                  type="button"
                  onClick={() => onFollowToggle(resolvedSeller)}
                  disabled={isFollowLoading}
                  className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1 ${
                    isFollowingSeller
                      ? 'bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 border border-gray-200'
                      : sellerFollowsMe
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-200 ring-2 ring-blue-400/20'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isFollowingSeller ? (
                    'Following'
                  ) : sellerFollowsMe ? (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Follow Back</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Follow</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Vehicle Information */}
          <div className="glass-panel rounded-xl overflow-hidden">
            <div className="bg-white/60 px-5 py-3 border-b border-gray-100 backdrop-blur-sm">
              <h2 className="text-sm font-bold text-gray-900">{t.vehicleSpecs}</h2>
            </div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-xs">
              <div className="flex justify-between border-b border-gray-100 pb-1.5">
                <span className="text-gray-500 font-medium">{t.vin}</span>
                <span className="font-mono text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">{vehicle.vin}</span>
              </div>
              {vehicle.ownerUsername && (
                <div 
                  className="flex justify-between border-b border-gray-100 pb-1.5 cursor-pointer hover:bg-indigo-50/50 rounded px-1 -mx-1 transition"
                  onClick={() => onViewProfile && onViewProfile(resolvedSeller)}
                  title="Click to view seller profile"
                >
                  <span className="text-gray-500 font-medium">Listed By</span>
                  <span className="font-semibold text-indigo-600 flex items-center gap-1">
                    @{vehicle.ownerUsername}
                    <span className="text-[10px] text-gray-400">↗</span>
                  </span>
                </div>
              )}
              <div className="flex justify-between border-b border-gray-100 pb-1.5">
                <span className="text-gray-500 font-medium">{t.odometer}</span>
                <span className="font-semibold text-gray-900">{vehicle.odometer.toLocaleString()} mi</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1.5">
                <span className="text-gray-500 font-medium">{t.primaryDamage}</span>
                <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded text-[11px]">{vehicle.primaryDamage}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1.5">
                <span className="text-gray-500 font-medium">{t.secondaryDamage}</span>
                <span className="font-medium text-gray-900">{vehicle.secondaryDamage || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1.5">
                <span className="text-gray-500 font-medium">{t.engine}</span>
                <span className="font-medium text-gray-900">{vehicle.engine}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1.5">
                <span className="text-gray-500 font-medium">{t.topSpeed}</span>
                <span className="font-medium text-gray-900">{vehicle.topSpeed || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1.5">
                <span className="text-gray-500 font-medium">{t.mpg}</span>
                <span className="font-medium text-gray-900">{vehicle.mpg || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1.5">
                <span className="text-gray-500 font-medium">Drive</span>
                <span className="font-medium text-gray-900">{vehicle.drive}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1.5">
                <span className="text-gray-500 font-medium">Transmission</span>
                <span className="font-medium text-gray-900">{vehicle.transmission}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1.5">
                <span className="text-gray-500 font-medium">{t.keys}</span>
                <span className={`font-bold ${vehicle.hasKeys ? 'text-green-600' : 'text-red-600'}`}>
                  {vehicle.hasKeys ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1.5 items-center">
                <span className="text-gray-500 font-medium">Registration Card (RC)</span>
                {vehicle.hasRegistrationCard ? (
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200 flex items-center gap-1">
                      <span>✓</span> Available
                    </span>
                    {vehicle.rcCardUrl && (
                      <button
                        type="button"
                        onClick={() => setShowRcModal(true)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200 transition flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>View RC</span>
                        <span>↗</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[11px] border border-amber-200">
                    Not Available
                  </span>
                )}
              </div>
              {vehicle.rcCardNumber && (
                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span className="text-gray-500 font-medium">RC Number</span>
                  <span className="font-mono font-bold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded text-[11px]">
                    {vehicle.rcCardNumber}
                  </span>
                </div>
              )}
            </div>
            
            {/* Description Section */}
            {vehicle.description && (
                <div className="px-5 pb-5 pt-0">
                    <h3 className="font-bold text-gray-800 mb-2 text-xs uppercase tracking-wide">{t.sellerDesc}</h3>
                    <div className="bg-gray-50/70 p-3.5 rounded-lg border border-gray-100 text-gray-700 text-xs leading-relaxed">
                        {vehicle.description}
                    </div>
                </div>
            )}
          </div>

          {/* AI Analysis Section */}
          <div className="relative overflow-hidden rounded-xl shadow-xs border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white/90 backdrop-blur-xl">
             <div className="px-5 py-3.5 border-b border-indigo-100/50 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-100/70 rounded-lg text-indigo-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  </div>
                  <h2 className="text-sm font-bold text-indigo-950">{t.aiInsight}</h2>
                </div>
                {!analysis && (
                  <button 
                    onClick={handleGenerateAnalysis}
                    disabled={isLoadingAnalysis}
                    className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 shadow-sm text-white px-3.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
                  >
                    {isLoadingAnalysis ? t.analyzing : t.generateReport}
                  </button>
                )}
             </div>
             <div className="p-5 relative z-10 text-xs">
                {!analysis && !isLoadingAnalysis && (
                  <p className="text-indigo-500 text-center py-3 font-medium">
                    Tap the button above to unlock AI-powered insights regarding potential hidden damages and repair complexity.
                  </p>
                )}
                {isLoadingAnalysis && (
                  <div className="animate-pulse space-y-2.5">
                    <div className="h-3 bg-indigo-200/50 rounded-md w-3/4"></div>
                    <div className="h-3 bg-indigo-200/50 rounded-md w-full"></div>
                    <div className="h-3 bg-indigo-200/50 rounded-md w-5/6"></div>
                  </div>
                )}
                {analysis && (
                   <div className="prose prose-xs prose-indigo text-gray-700 max-w-none bg-white/70 p-4 rounded-xl border border-indigo-50 leading-relaxed">
                     <div dangerouslySetInnerHTML={{ __html: analysis.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} />
                   </div>
                )}
             </div>
          </div>
        </div>

        {/* Right Column: Bidding Interface */}
        <div className="space-y-4">
           <div className={`glass-panel p-4 sm:p-5 rounded-xl sticky top-20 border-t-4 ${
             isDirectSale ? 'border-t-emerald-500' :
             isUpcoming ? 'border-t-blue-500' :
             isEnded ? 'border-t-gray-500' : 'border-t-red-500'
           }`}>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1.5 leading-snug">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </h1>
              
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 mb-4">
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] border ${
                  isDirectSale ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                  isUpcoming ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  isEnded ? 'bg-gray-100 text-gray-700 border-gray-200' :
                  'bg-red-50 text-red-700 border-red-200'
                }`}>
                  {isDirectSale ? '🏷️ Vehicles For Sale (Direct)' : isUpcoming ? '📅 Upcoming Auction' : isEnded ? '🏁 Auction Concluded' : '🔴 Live Auction'}
                </span>
                <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px]">Lot #: {vehicle.id}</span>
                <span className="font-mono text-gray-500 text-[10px] ml-auto">
                  {isDirectSale ? '3 Months Valid' : currentTimeLeft}
                </span>
              </div>

              {/* Price Display */}
              <div className="bg-gray-50/80 p-3.5 rounded-xl mb-4 border border-gray-100">
                 <div className="flex justify-between items-baseline mb-1">
                   <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                     {isDirectSale ? 'Fixed Asking Price' : isUpcoming ? 'Asking Price' : t.currentBid}
                   </span>
                   <span className="text-2xl font-black text-gray-900 tracking-tight">
                     ₹{(isDirectSale ? (vehicle.directPrice || vehicle.startingPrice || vehicle.currentBid) : isUpcoming ? askingPrice : vehicle.currentBid).toLocaleString()}
                   </span>
                 </div>
                 {vehicle.buyNowPrice && !isDirectSale && (
                    <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-gray-200">
                      <span className="text-gray-500 font-medium">{t.buyNow}</span>
                      <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">₹{vehicle.buyNowPrice.toLocaleString()}</span>
                    </div>
                 )}
                 {isLive && vehicle.winningUsername && (
                    <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-gray-200">
                      <span className="text-gray-500 font-medium">Leading Bidder</span>
                      <span className="font-semibold text-indigo-600">@{vehicle.winningUsername}</span>
                    </div>
                 )}
                 {vehicle.firstBidderUsername && !isDirectSale && (
                    <div className="flex justify-between items-center text-xs mt-1 text-gray-500">
                      <span>1st Bidder (from Upcoming)</span>
                      <span className="font-medium text-emerald-600">@{vehicle.firstBidderUsername}</span>
                    </div>
                 )}
              </div>

              {/* DIRECT SALE FLOW */}
              {isDirectSale && (
                <div className="space-y-3.5">
                  <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3 text-xs text-emerald-900 leading-relaxed">
                    <div className="flex items-center gap-1.5 font-bold mb-1 text-emerald-950">
                      <span>🏷️</span>
                      <span>Sell Without Auction • Direct Fixed Price</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      This vehicle is listed directly at fixed price <strong>₹{(vehicle.directPrice || vehicle.currentBid).toLocaleString()}</strong> with no bidding countdown.
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-1">
                      Listed for a total of 3 months. Contact seller or express purchase interest below.
                    </p>
                  </div>

                  {!isOwner ? (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          alert(`Your purchase request for ${vehicle.year} ${vehicle.make} ${vehicle.model} at ₹${(vehicle.directPrice || vehicle.currentBid).toLocaleString()} has been sent to the seller @${vehicle.ownerUsername || 'Seller'}!`);
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-lg text-xs sm:text-sm shadow-md transition"
                      >
                        Buy Now at Fixed Price (₹{(vehicle.directPrice || vehicle.currentBid).toLocaleString()})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          alert(`Contacting seller @${vehicle.ownerUsername || 'Owner'}. Support hotline: 1800-AUTOBID.`);
                        }}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 rounded-lg text-xs border border-gray-200 transition"
                      >
                        Message Seller @{vehicle.ownerUsername || 'Owner'}
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center text-xs text-gray-600">
                      <p className="font-bold text-gray-800 mb-1">You own this Direct Sale listing</p>
                      <p className="text-[11px] text-gray-500">
                        Listed in 'Vehicles For Sale'. Automatically active for 3 months.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* UPCOMING AUCTION FLOW */}
              {isUpcoming && (
                <div className="space-y-3.5">
                  <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900 leading-relaxed">
                    <div className="flex items-center gap-1.5 font-bold mb-1 text-blue-950">
                      <span>🎯</span>
                      <span>Upcoming Pre-Bidding Active</span>
                    </div>
                    <p className="text-[11px] text-blue-800">
                      Everyone can participate at the same asking price of <strong>₹{askingPrice.toLocaleString()}</strong>.
                    </p>
                    <p className="text-[11px] text-blue-800 mt-1">
                      🔔 <strong>Live Alerts:</strong> When this auction goes LIVE, all participating and interested users receive instant notifications and email alerts that bidding is open!
                    </p>
                    <p className="text-[11px] text-blue-800 mt-1">
                      The last user to register holds the <strong>1st Bidder Priority</strong>. Once live, bidding enters real competition: highest bidder wins, and outbid bidders lose.
                    </p>
                  </div>

                  {/* Joined Pre-Bidders List */}
                  <div className="bg-gray-50/90 rounded-xl p-3 border border-gray-200/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-800">Participants ({upcomingBids.length})</span>
                      <span className="text-[10px] text-gray-500">Same Asking Price</span>
                    </div>

                    {upcomingBids.length === 0 ? (
                      <p className="text-xs text-gray-400 italic text-center py-2">No pre-bids yet. Be the first to join!</p>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {upcomingBids.map((b, idx) => {
                          const isLast = idx === upcomingBids.length - 1;
                          const isMe = currentUser && b.userId === currentUser.id;
                          return (
                            <div 
                              key={b.userId + idx} 
                              className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg border transition-all ${
                                isLast 
                                  ? 'bg-amber-50/90 border-amber-300 text-amber-950 font-semibold' 
                                  : 'bg-white border-gray-100 text-gray-600'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] text-gray-400">#{idx + 1}</span>
                                <span>@{b.username}</span>
                                {isMe && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1 rounded font-bold">You</span>}
                              </div>
                              {isLast ? (
                                <span className="text-[9.5px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1">
                                  <span>🌟</span> 1st Bidder Priority
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400">Registered</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Status & Actions for Current User */}
                  {currentUser && !currentUser.isVerified && (
                    <div 
                      onClick={() => setShowVerificationModal(true)}
                      className="cursor-pointer p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl flex items-center gap-2.5 transition shadow-xs"
                    >
                      <span className="text-lg">🛡️</span>
                      <div className="flex-1 text-left">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-amber-900">ID Verification Required</p>
                          <span className="text-[9px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded">Verify Now</span>
                        </div>
                        <p className="text-[10px] text-amber-700">Verify your ID to participate in auctions.</p>
                      </div>
                    </div>
                  )}

                  {hasUserPreBid && isUserLeadingPreBid && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                      <span className="text-base">🌟</span>
                      <div>
                        <p className="font-bold text-emerald-900">You hold the 1st Bidder Priority!</p>
                        <p className="text-[10px] text-emerald-700">When this auction begins, you will hold the 1st leading bid of ₹{askingPrice.toLocaleString()}.</p>
                      </div>
                    </div>
                  )}

                  {hasUserPreBid && !isUserLeadingPreBid && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                      <span className="text-base">⚠️</span>
                      <div className="flex-1">
                        <p className="font-bold text-amber-900">Priority Shifted</p>
                        <p className="text-[10px] text-amber-700">@{lastPreBidder?.username} joined after you. Re-stake below to reclaim 1st Bidder priority!</p>
                      </div>
                    </div>
                  )}

                  <button 
                    type="button"
                    onClick={handleUpcomingBidClick}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 rounded-lg active:scale-[0.99] transition-all text-xs sm:text-sm shadow-md"
                  >
                    {!hasUserPreBid 
                      ? `Join Upcoming Auction at Asking Price (₹${askingPrice.toLocaleString()})`
                      : isUserLeadingPreBid
                      ? `Re-Confirm 1st Bidder Priority (₹${askingPrice.toLocaleString()})`
                      : `Re-Stake 1st Bidder Priority (₹${askingPrice.toLocaleString()})`
                    }
                  </button>
                  <p className="text-[10px] text-gray-400 text-center">
                    Joining upcoming auction pre-bidding notifies you when live. You only risk losing once you participate in live competition.
                  </p>
                </div>
              )}

              {/* LIVE AUCTION FLOW */}
              {isLive && (
                <form onSubmit={handleBidSubmit} className="space-y-3.5">
                   <div className="bg-red-50/90 border border-red-200 rounded-xl p-2.5 text-xs text-red-900">
                     <div className="font-bold flex items-center gap-1.5 text-red-950 mb-0.5">
                       <span>🔴</span>
                       <span>Live Auction • Real Competition</span>
                     </div>
                     <p className="text-[11px] text-red-800">
                       Real competition is active! Whoever bids the highest price wins this vehicle, and outbid bidders will be marked as lost when the auction ends.
                     </p>
                   </div>

                   <div>
                     <label className="block text-xs font-bold text-gray-700 mb-1.5">{t.setMaxBid}</label>
                     <div className="relative group">
                       <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-sm">₹</span>
                       <input 
                          type="number"
                          value={bidAmount}
                          onChange={(e) => setBidAmount(parseInt(e.target.value) || 0)}
                          min={vehicle.currentBid + 50}
                          step={50}
                          className="w-full pl-6 pr-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none text-base font-bold text-gray-800 transition-all"
                       />
                     </div>
                     <p className="text-[10px] text-gray-400 mt-1 text-right font-medium">Minimum increment: ₹50</p>
                   </div>
                   
                   {currentUser && !currentUser.isVerified && (
                     <div 
                       onClick={() => setShowVerificationModal(true)}
                       className="cursor-pointer mb-2 p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl flex items-center gap-2.5 transition shadow-xs"
                     >
                       <span className="text-lg">🛡️</span>
                       <div className="flex-1 text-left">
                         <div className="flex items-center justify-between">
                           <p className="text-xs font-bold text-amber-900">ID Verification Required</p>
                           <span className="text-[9px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.2 rounded">Verify Now</span>
                         </div>
                         <p className="text-[10px] text-amber-700">Verify your PAN or National ID to place bids.</p>
                       </div>
                     </div>
                   )}

                   {currentUser && currentUser.isVerified && (
                     <div className="mb-2 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
                       <span>🛡️</span>
                       <span className="text-[11px]">Verified Bidder — Live bidding authorized</span>
                     </div>
                   )}

                   <button 
                     type="submit"
                     className="w-full bg-gradient-to-r from-red-600 to-red-500 text-white font-bold py-2.5 rounded-lg hover:brightness-105 active:scale-[0.99] transition-all text-xs sm:text-sm shadow-sm"
                   >
                     {t.placeBid} (Confirm Live Participation)
                   </button>
                   <p className="text-[10px] text-gray-400 text-center">
                     Placing a live bid enters you into the real competition.
                   </p>
                </form>
              )}

              {/* CONCLUDED / SOLD FLOW */}
              {isEnded && (
                <div className="space-y-3">
                  <div className="bg-gray-100 p-4 rounded-xl text-center space-y-2">
                     <div className="text-sm font-bold text-gray-800">This Auction Has Concluded</div>
                     {vehicle.winningUsername ? (
                       <div className="text-xs text-emerald-700 font-semibold">
                         Won by @{vehicle.winningUsername} for ₹{vehicle.currentBid.toLocaleString()}
                       </div>
                     ) : (
                       <div className="text-xs text-gray-500">Ended without winning bidder</div>
                     )}
                     {currentUser && vehicle.winningUserId === currentUser.id && (
                       <div className="mt-2 bg-emerald-600 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-xs flex items-center justify-center gap-1.5">
                         <span>🏆</span> You Won This Auction!
                       </div>
                     )}
                     {currentUser && vehicle.winningUserId && vehicle.winningUserId !== currentUser.id && (vehicle.liveParticipants || []).includes(currentUser.id) && (
                       <div className="mt-2 bg-rose-100 text-rose-800 text-xs font-bold py-1.5 px-3 rounded-lg border border-rose-200 flex items-center justify-center gap-1.5">
                         <span>✕</span> You Were Outbid (Auction Lost)
                       </div>
                     )}
                  </div>

                  {/* Shift Unsold Auction Vehicle to Direct Sale (Process 2) */}
                  {isOwner && isUnsoldAuction && onConvertToDirectSale && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-2.5 text-left animate-fade-in shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🏷️</span>
                        <div>
                          <h4 className="text-xs font-bold text-emerald-950">Unsold in Auction? Give It a 2nd Chance!</h4>
                          <p className="text-[10px] text-emerald-700 leading-tight">
                            Shift this vehicle to "Sell Without Auction" at a fixed price and leave it listed for 3 months.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowDirectShiftModal(true)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs shadow-xs transition flex items-center justify-center gap-1.5"
                      >
                        <span>🏷️</span>
                        <span>Shift to Sell Without Auction (Direct Sale) →</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-gray-100">
                 <h4 className="font-bold text-gray-800 text-xs mb-2.5 uppercase tracking-wider">{t.saleStatus}</h4>
                 <div className="space-y-2 text-xs bg-gray-50/70 p-3 rounded-lg border border-gray-100">
                   <div className="flex justify-between">
                     <span className="text-gray-500">{t.saleDate}</span>
                     <span className="text-gray-900 font-medium">{isUpcoming ? 'Scheduled Upcoming' : 'Active'}</span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-gray-500">{isUpcoming ? 'Auction Starts' : t.timeLeft}</span>
                     <span className={`font-bold ${isUpcoming ? 'text-blue-600' : isEnded ? 'text-gray-500' : 'text-red-500 animate-pulse'}`}>
                       {currentTimeLeft}
                     </span>
                   </div>
                   <div className="flex justify-between">
                     <span className="text-gray-500">Location</span>
                     <span className="text-gray-900 font-medium">{vehicle.location}</span>
                   </div>
                 </div>
                 {currentUser && onMarkSold && vehicle.status !== 'Sold' && (currentUser.role === 'admin' || currentUser.id === vehicle.ownerId) && (
                     <button 
                       onClick={onMarkSold}
                       className="mt-3 w-full bg-gray-900 text-white font-bold py-2 rounded-lg hover:bg-black transition-all text-xs shadow-xs"
                     >
                       Close Auction & Mark as Sold
                     </button>
                 )}
              </div>
           </div>
        </div>
      </div>

      {/* Bid Confirmation Modal */}
      {showBidModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 transform transition-all animate-fade-in-up">
            <div className="flex items-center gap-3.5 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shadow-sm shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Confirm Your Bid</h3>
                <p className="text-xs text-gray-500">Please review your bid before submitting</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 mb-5 space-y-3 border border-gray-100 text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                <span className="text-gray-500 font-medium">Vehicle</span>
                <span className="font-bold text-gray-900 text-right">{vehicle.year} {vehicle.make} {vehicle.model}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                <span className="text-gray-500 font-medium">Current Bid</span>
                <span className="text-gray-700 font-bold">₹{vehicle.currentBid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-gray-200/60 bg-red-50/80 p-2.5 rounded-xl border border-red-100">
                <span className="text-red-700 font-bold">Your New Bid</span>
                <span className="text-xl font-black text-red-600">₹{bidAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 px-1">
                <span>Minimum Increase</span>
                <span className="font-semibold text-emerald-600">+₹{(bidAmount - vehicle.currentBid).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-500 px-1 pt-2 border-t border-gray-200/40">
                <span>Available Wallet Balance</span>
                <span className="font-bold text-gray-800">₹{(currentUser?.deposits || 0).toLocaleString()}</span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 flex gap-2.5 items-start text-xs text-amber-800">
              <span className="text-base leading-none shrink-0">⚠️</span>
              <p className="leading-snug">
                Are you sure you want to place this bid? All bids are legally binding commitments to purchase if you win this vehicle.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowBidModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-100 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBid}
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white font-bold shadow-lg shadow-red-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm"
              >
                Yes, Place Bid
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Sale Shift Modal */}
      {showDirectShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-gray-100 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl shrink-0">
                🏷️
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">Shift to Sell Without Auction</h3>
                <p className="text-xs text-gray-500">2nd chance direct sale listing</p>
              </div>
            </div>

            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 mb-4 text-xs text-emerald-800 space-y-1">
              <p className="font-semibold text-emerald-950">How it works:</p>
              <p>• Your vehicle will be listed in <strong>Vehicles For Sale</strong> at your fixed asking price.</p>
              <p>• No auction or countdown pressure.</p>
              <p>• Stays active for <strong>3 months</strong>, then automatically blacklisted if unsold.</p>
            </div>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Fixed Asking Price (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    value={newDirectPrice}
                    onChange={(e) => setNewDirectPrice(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-gray-300 rounded-lg font-bold text-sm text-gray-900 focus:ring-2 focus:ring-emerald-400 outline-none"
                    placeholder="Enter fixed price"
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Previous starting bid was ₹{(vehicle.startingPrice || vehicle.currentBid).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowDirectShiftModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 font-bold text-gray-600 hover:bg-gray-100 text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newDirectPrice || newDirectPrice <= 0) {
                    alert("Please enter a valid fixed selling price.");
                    return;
                  }
                  setShowDirectShiftModal(false);
                  if (onConvertToDirectSale) {
                    onConvertToDirectSale(vehicle.id, newDirectPrice);
                  }
                }}
                className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
              >
                Confirm & Shift (3 Months)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ID Verification Modal */}
      {showVerificationModal && currentUser && (
        <IdentityVerificationModal
          currentUser={currentUser}
          isOpen={true}
          gateReason="bid"
          onClose={() => setShowVerificationModal(false)}
          onVerificationSubmitted={() => {
            setShowVerificationModal(false);
            alert("Verification request submitted! Our verification team / admin will review your details shortly. Once approved, you can place bids.");
          }}
        />
      )}

      {/* Fullscreen HD Lightbox Modal (Guarantees Full, Uncropped Vehicle View) */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Top Bar */}
          <div 
            className="w-full max-w-6xl flex items-center justify-between text-white z-10 py-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-sm sm:text-base">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </span>
              <span className="bg-white/15 px-2 py-0.5 rounded-full text-xs font-mono font-medium">
                {currentImageIndex + 1} of {galleryImages.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFitMode(fitMode === 'contain' ? 'cover' : 'contain')}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/20 transition cursor-pointer"
              >
                {fitMode === 'contain' ? 'Fit (100% Full View)' : 'Fill'}
              </button>
              <button
                type="button"
                onClick={() => setIsLightboxOpen(false)}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 text-white font-bold text-lg flex items-center justify-center transition cursor-pointer"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Centered High-Resolution Image Container */}
          <div 
            className="relative flex-1 w-full max-w-6xl flex items-center justify-center my-auto overflow-hidden p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={mainImage} 
              alt="Full Resolution View" 
              className={`max-h-[82vh] max-w-[95vw] rounded-lg shadow-2xl transition-all duration-200 ${
                fitMode === 'contain' ? 'object-contain' : 'object-cover'
              }`}
            />

            {/* Prev & Next Floating Buttons */}
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white text-2xl flex items-center justify-center transition border border-white/20 shadow-lg cursor-pointer"
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 text-white text-2xl flex items-center justify-center transition border border-white/20 shadow-lg cursor-pointer"
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails Strip */}
          <div 
            className="w-full max-w-4xl flex items-center justify-center gap-2 overflow-x-auto py-1 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {galleryImages.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`thumb-${i}`}
                onClick={() => setMainImage(img)}
                className={`h-12 w-16 sm:h-14 sm:w-20 object-cover rounded-lg border-2 cursor-pointer transition ${
                  mainImage === img ? 'border-red-500 scale-105' : 'border-white/20 opacity-60 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* RC Card Document Viewer Modal */}
      {showRcModal && vehicle.rcCardUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
          onClick={() => setShowRcModal(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full p-4 sm:p-5 shadow-2xl space-y-3.5 border border-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-base">
                  📄
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                    Vehicle Registration Certificate (RC)
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Official document verified by AutoBid verification standards
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRcModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-xs transition"
              >
                ✕
              </button>
            </div>

            {/* Document Info Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-gray-50 p-2.5 rounded-xl border border-gray-100">
              <div>
                <span className="text-[10px] text-gray-400 block font-semibold">Vehicle</span>
                <strong className="text-gray-900">{vehicle.year} {vehicle.make} {vehicle.model}</strong>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-semibold">RC Status</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <span>✓</span> Verified & Uploaded
                </span>
              </div>
              {vehicle.rcCardNumber && (
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-gray-400 block font-semibold">RC Number</span>
                  <span className="font-mono font-bold text-gray-900">{vehicle.rcCardNumber}</span>
                </div>
              )}
            </div>

            {/* Full High-Resolution RC Document View */}
            <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-slate-950 flex items-center justify-center max-h-[60vh]">
              <img 
                src={vehicle.rcCardUrl} 
                alt="RC Card Document" 
                className="max-h-[58vh] w-auto max-w-full object-contain"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-gray-400">
                🔒 Protected document display for authorized platform users
              </span>
              <button
                type="button"
                onClick={() => setShowRcModal(false)}
                className="bg-gray-900 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-xl transition"
              >
                Close Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};