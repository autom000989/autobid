import React, { useState } from 'react';
import { Vehicle, VehicleStatus, User } from '../types';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface BoostPlan {
    id: string;
    name: string;
    price: number;
    duration: string;
    durationMs: number;
    multiplier: string;
    features: string[];
    badgeColor: string;
}

const BOOST_PLANS: BoostPlan[] = [
    {
        id: 'starter',
        name: 'Starter Turbo',
        price: 199,
        duration: '24 Hours',
        durationMs: 24 * 60 * 60 * 1000,
        multiplier: '2x More Views',
        features: ['24-Hour highlighted card', 'Featured tag on feed', 'Ranked higher in search'],
        badgeColor: 'from-amber-500 to-orange-500'
    },
    {
        id: 'surge',
        name: 'Super Surge',
        price: 499,
        duration: '3 Days',
        durationMs: 3 * 24 * 60 * 60 * 1000,
        multiplier: '5x More Views',
        features: ['3 Days top-tier placement', 'Push notification to bidders', 'Priority in Live Auction grid', 'Highlighted border'],
        badgeColor: 'from-red-600 to-pink-600'
    },
    {
        id: 'vip',
        name: 'Ultra VIP',
        price: 999,
        duration: 'Full Auction Duration',
        durationMs: 14 * 24 * 60 * 60 * 1000,
        multiplier: '10x Viral Reach',
        features: ['Sticky top placement till auction ends', 'VIP Gold badge on vehicle', 'Instant alerts to saved buyers', 'Maximum buyer exposure'],
        badgeColor: 'from-purple-600 to-indigo-600'
    }
];

interface DashboardViewProps {
    userVehicles: Vehicle[];
    currentUser?: User;
    onNavigate?: (page: string) => void;
    onSelectVehicle?: (vehicle: Vehicle) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ 
    userVehicles, 
    currentUser, 
    onNavigate,
    onSelectVehicle 
}) => {
    // Post Tabs: 'current' | 'closed'
    const [postsTab, setPostsTab] = useState<'current' | 'closed'>('current');
    // Closed Sub-Filter: 'all' | 'sold' | 'unsold'
    const [closedFilter, setClosedFilter] = useState<'all' | 'sold' | 'unsold'>('all');

    // Boost Modal State
    const [selectedVehicleForBoost, setSelectedVehicleForBoost] = useState<Vehicle | null>(null);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('surge');
    const [isBoosting, setIsBoosting] = useState<boolean>(false);
    const [boostMessage, setBoostMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);
    const [endedVehicleNotice, setEndedVehicleNotice] = useState<string | null>(null);

    const now = Date.now();
    const availableBalance = currentUser?.deposits || 0;

    // Stats calculations
    const totalListed = userVehicles.length;
    
    // Categorized Sales
    const soldBid = userVehicles.filter(v => (v.status === VehicleStatus.SOLD || (v.status as string) === 'Sold') && (v.soldVia === 'bid' || !v.soldVia)).length;
    const soldDirect = userVehicles.filter(v => (v.status === VehicleStatus.SOLD || (v.status as string) === 'Sold') && v.soldVia === 'direct').length;
    const soldLive = userVehicles.filter(v => (v.status === VehicleStatus.SOLD || (v.status as string) === 'Sold') && v.soldVia === 'live').length;

    // Unsold calculations
    const isVehicleClosed = (v: Vehicle) => v.status === VehicleStatus.SOLD || (v.status as string) === 'Sold' || (v.status as string) === 'Ended' || v.endTime <= now;
    const isVehicleSold = (v: Vehicle) => v.status === VehicleStatus.SOLD || (v.status as string) === 'Sold' || !!v.soldVia;
    const isVehicleUnsold = (v: Vehicle) => isVehicleClosed(v) && !isVehicleSold(v);

    const unsoldBid = userVehicles.filter(v => isVehicleUnsold(v) && !v.isBoosted).length;
    const unsoldLive = userVehicles.filter(v => isVehicleUnsold(v) && (v.status === VehicleStatus.LIVE || (v.status as string) === 'Live Auction')).length;
    const unsoldBoosted = userVehicles.filter(v => isVehicleUnsold(v) && v.isBoosted).length;

    // Aggregate Views and Wishlists
    const totalViews = userVehicles.reduce((acc, v) => acc + (v.views || 0), 0);
    const totalWishlists = userVehicles.reduce((acc, v) => acc + (v.interestedCount || v.watchCount || 0), 0);

    // Filter Posts
    const currentAuctions = userVehicles.filter(v => !isVehicleClosed(v));
    const allClosedAuctions = userVehicles.filter(v => isVehicleClosed(v));
    const soldClosedAuctions = allClosedAuctions.filter(v => isVehicleSold(v));
    const unsoldClosedAuctions = allClosedAuctions.filter(v => isVehicleUnsold(v));

    let displayedPosts: Vehicle[] = [];
    if (postsTab === 'current') {
        displayedPosts = currentAuctions;
    } else {
        if (closedFilter === 'sold') displayedPosts = soldClosedAuctions;
        else if (closedFilter === 'unsold') displayedPosts = unsoldClosedAuctions;
        else displayedPosts = allClosedAuctions;
    }

    // Boost Click Handler
    const handleBoostClick = (vehicle: Vehicle) => {
        if (isVehicleClosed(vehicle)) {
            setEndedVehicleNotice(`The selected vehicle (${vehicle.year} ${vehicle.make} ${vehicle.model}) auction period has ended. Please select a currently running auction vehicle to boost.`);
            return;
        }

        setSelectedVehicleForBoost(vehicle);
        setBoostMessage(null);
    };

    // Confirm Paid Boost
    const handleConfirmBoost = async () => {
        if (!selectedVehicleForBoost || !currentUser) return;

        const plan = BOOST_PLANS.find(p => p.id === selectedPlanId);
        if (!plan) return;

        if (availableBalance < plan.price) {
            setBoostMessage({
                text: `Insufficient wallet balance. Required: ₹${plan.price.toLocaleString()}, Available: ₹${availableBalance.toLocaleString()}. Please top up your wallet.`,
                type: 'error'
            });
            return;
        }

        setIsBoosting(true);
        try {
            const newBalance = availableBalance - plan.price;
            
            // Deduct balance from user
            await updateDoc(doc(db, 'users', currentUser.id), {
                deposits: newBalance
            });

            // Update Vehicle with boost plan
            await updateDoc(doc(db, 'vehicles', selectedVehicleForBoost.id), {
                isBoosted: true,
                boostPlan: plan.name,
                views: (selectedVehicleForBoost.views || 0) + (plan.id === 'vip' ? 50 : plan.id === 'surge' ? 25 : 10)
            });

            // Create Transaction record
            await addDoc(collection(db, 'transactions'), {
                userId: currentUser.id,
                username: currentUser.username,
                type: 'admin_deduct',
                amount: plan.price,
                description: `Boost Plan (${plan.name}) for ${selectedVehicleForBoost.year} ${selectedVehicleForBoost.make} ${selectedVehicleForBoost.model}`,
                timestamp: Date.now(),
                status: 'success',
                balanceAfter: newBalance
            });

            setBoostMessage({
                text: `🎉 Success! Your post has been boosted with the ${plan.name} plan.`,
                type: 'success'
            });

            setTimeout(() => {
                setSelectedVehicleForBoost(null);
                setBoostMessage(null);
            }, 1800);
        } catch (err: any) {
            console.error("Error activating boost:", err);
            setBoostMessage({
                text: `Failed to boost vehicle: ${err.message || 'Server error'}`,
                type: 'error'
            });
        } finally {
            setIsBoosting(false);
        }
    };

    return (
        <div className="mt-4 px-2 sm:px-4 max-w-5xl mx-auto space-y-8 animate-fade-in-up">
            
            {/* Header with Available Balance */}
            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-gray-700/50 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse"></span>
                        <span className="text-xs uppercase font-bold tracking-widest text-gray-400">Seller Activity Control Center</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Manage Dashboard</h2>
                    <p className="text-gray-400 text-sm mt-1">Track vehicle sales, bidding performance, views, wishlists, and post boosts.</p>
                </div>

                {/* Available Balance Pill */}
                <div className="relative z-10 w-full md:w-auto bg-white/10 backdrop-blur-md border border-white/20 p-4 sm:p-5 rounded-2xl flex items-center justify-between md:justify-start gap-5">
                    <div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-300">
                            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                            Available Balance
                        </div>
                        <div className="text-2xl sm:text-3xl font-black text-white mt-1">
                            ₹{availableBalance.toLocaleString()}
                        </div>
                    </div>

                    {onNavigate && (
                        <button
                            onClick={() => onNavigate('settings')}
                            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                        >
                            + Top Up
                        </button>
                    )}
                </div>

                {/* Decorative background glow */}
                <div className="absolute -right-16 -top-16 w-64 h-64 bg-red-600/20 rounded-full blur-3xl pointer-events-none"></div>
            </div>

            {/* Performance Analytics Grid */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        Listing Metrics Overview
                    </h3>
                    <span className="text-xs text-gray-500 font-medium">Real-time statistics</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <StatCard 
                        title="Total Vehicles Listed" 
                        value={totalListed} 
                        icon="🚗" 
                        subtitle={totalListed === 0 ? "0 Listed" : `${totalListed} registered`} 
                    />
                    <StatCard 
                        title="Total Views" 
                        value={totalViews} 
                        icon="👁️" 
                        subtitle="Across all posts" 
                    />
                    <StatCard 
                        title="Total Wishlists" 
                        value={totalWishlists} 
                        icon="❤️" 
                        subtitle="Saved by buyers" 
                    />
                    <StatCard 
                        title="Sold (Bidding)" 
                        value={soldBid} 
                        icon="🔨" 
                        subtitle="Via competitive auction" 
                    />
                    <StatCard 
                        title="Sold (Direct Buy)" 
                        value={soldDirect} 
                        icon="⚡" 
                        subtitle="Purchased instantly" 
                    />
                    <StatCard 
                        title="Sold (Live Listing)" 
                        value={soldLive} 
                        icon="🔴" 
                        subtitle="Sold in live phase" 
                    />
                    <StatCard 
                        title="Unsold (Bidding)" 
                        value={unsoldBid} 
                        icon="⏳" 
                        subtitle="Ended with no winner" 
                    />
                    <StatCard 
                        title="Unsold (After Boost)" 
                        value={unsoldBoosted} 
                        icon="📉" 
                        subtitle="Ended after promotion" 
                    />
                </div>
            </div>

            {/* My Posts Section with Current & Closed tabs */}
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-200/80 shadow-sm space-y-6">
                
                {/* Header & Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
                    <div>
                        <h3 className="font-extrabold text-xl text-gray-900">My Posts</h3>
                        <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Filter between your current active listings and closed auctions.</p>
                    </div>

                    {/* Primary Tab Switcher: Current vs Closed */}
                    <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1 self-start sm:self-auto border border-gray-200">
                        <button
                            onClick={() => setPostsTab('current')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                postsTab === 'current'
                                    ? 'bg-white text-gray-900 shadow-md'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            My Current Auctions
                            <span className="ml-1 bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-[10px]">
                                {currentAuctions.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setPostsTab('closed')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                postsTab === 'closed'
                                    ? 'bg-white text-gray-900 shadow-md'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                            My Closed Auctions
                            <span className="ml-1 bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-[10px]">
                                {allClosedAuctions.length}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Sub-Options for Closed Auctions */}
                {postsTab === 'closed' && (
                    <div className="bg-gray-50/80 border border-gray-200/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">
                                Closed Auction Options:
                            </span>
                            <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm gap-1">
                                <button
                                    onClick={() => setClosedFilter('sold')}
                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        closedFilter === 'sold'
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'text-gray-700 hover:text-emerald-700 hover:bg-emerald-50'
                                    }`}
                                >
                                    <span className="text-sm">✓</span>
                                    <span>Sold Auctions</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                        closedFilter === 'sold' ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {soldClosedAuctions.length}
                                    </span>
                                </button>
                                <button
                                    onClick={() => setClosedFilter('unsold')}
                                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        closedFilter === 'unsold'
                                            ? 'bg-rose-600 text-white shadow-sm'
                                            : 'text-gray-700 hover:text-rose-700 hover:bg-rose-50'
                                    }`}
                                >
                                    <span className="text-sm">✕</span>
                                    <span>Unsold Closed Auctions</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                        closedFilter === 'unsold' ? 'bg-rose-700 text-white' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                        {unsoldClosedAuctions.length}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => setClosedFilter('all')}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
                                closedFilter === 'all'
                                    ? 'bg-gray-900 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/70'
                            }`}
                        >
                            All Closed ({allClosedAuctions.length})
                        </button>
                    </div>
                )}

                {/* Vehicle Posts List */}
                <div className="space-y-4">
                    {displayedPosts.length === 0 ? (
                        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
                            <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                                🚘
                            </div>
                            <p className="text-gray-900 font-bold text-base">
                                {totalListed === 0 ? "Total vehicle listed: 0" : "No vehicles found in this section"}
                            </p>
                            <p className="text-gray-400 text-xs mt-1 max-w-sm mx-auto">
                                {postsTab === 'current'
                                    ? "You don't have any running auctions right now. Tap 'Sell' in the navigation to list a new vehicle."
                                    : "You don't have any closed auctions in this filter category."}
                            </p>
                            {postsTab === 'current' && onNavigate && (
                                <button
                                    onClick={() => onNavigate('sell')}
                                    className="mt-4 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                                >
                                    + List a Vehicle
                                </button>
                            )}
                        </div>
                    ) : (
                        displayedPosts.map(vehicle => {
                            const closed = isVehicleClosed(vehicle);
                            const sold = isVehicleSold(vehicle);

                            return (
                                <div 
                                    key={vehicle.id} 
                                    className="bg-white border border-gray-200 hover:border-gray-300 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row gap-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
                                >
                                    {/* Thumbnail */}
                                    <div 
                                        className="relative w-full md:w-52 aspect-[16/10] flex-shrink-0 cursor-pointer overflow-hidden rounded-xl bg-slate-900/5 shadow-2xs"
                                        onClick={() => onSelectVehicle?.(vehicle)}
                                    >
                                        <img 
                                            src={vehicle.images?.[vehicle.coverImageIndex || 0] || `https://picsum.photos/id/${vehicle.imageSeed}/1200/800`} 
                                            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                                            alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                                        />
                                        
                                        {/* Status Badge on thumbnail */}
                                        <div className="absolute top-2 left-2 flex items-center gap-1">
                                            {sold ? (
                                                <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-md shadow-md uppercase tracking-wider">
                                                    Sold
                                                </span>
                                            ) : closed ? (
                                                <span className="bg-gray-800 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-md shadow-md uppercase tracking-wider">
                                                    Auction Ended
                                                </span>
                                            ) : vehicle.status === 'Live Auction' ? (
                                                <span className="bg-red-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-md shadow-md uppercase tracking-wider animate-pulse flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span> Live
                                                </span>
                                            ) : (
                                                <span className="bg-blue-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-md shadow-md uppercase tracking-wider">
                                                    {vehicle.status}
                                                </span>
                                            )}
                                            {vehicle.hasRegistrationCard && (
                                                <span className="bg-emerald-700/90 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded shadow-md border border-emerald-400/30 flex items-center gap-0.5" title="Registration Card (RC) Available">
                                                    <span>✓</span> RC
                                                </span>
                                            )}
                                        </div>

                                        {vehicle.isBoosted && (
                                            <div className="absolute bottom-2 left-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow flex items-center gap-1">
                                                <span>⚡</span> {vehicle.boostPlan || 'Boosted'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Info & Metrics */}
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div>
                                                    <h4 
                                                        onClick={() => onSelectVehicle?.(vehicle)}
                                                        className="font-bold text-gray-900 text-lg sm:text-xl hover:text-red-600 cursor-pointer transition-colors"
                                                    >
                                                        {vehicle.year} {vehicle.make} {vehicle.model}
                                                    </h4>
                                                    <p className="text-xs text-gray-400 font-mono mt-0.5">VIN: {vehicle.vin}</p>
                                                </div>

                                                {/* Pricing Block */}
                                                <div className="text-right">
                                                    <div className="text-xs text-gray-400 font-semibold uppercase">
                                                        {sold ? "Final Sold Price" : "Current Bid"}
                                                    </div>
                                                    <div className="text-xl sm:text-2xl font-black text-gray-900">
                                                        ₹{(vehicle.currentBid || 0).toLocaleString()}
                                                    </div>
                                                    {vehicle.buyNowPrice && (
                                                        <div className="text-xs text-blue-600 font-bold mt-0.5">
                                                            Direct Buy: ₹{vehicle.buyNowPrice.toLocaleString()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Views, Wishlists & Sale Meta */}
                                        <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-4 border-t border-gray-100 text-xs font-semibold text-gray-600">
                                            {/* Particular vehicle views */}
                                            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                                <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                <span>{vehicle.views || 0} Views</span>
                                            </div>

                                            {/* Particular vehicle wishlists */}
                                            <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                                <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                                <span>{vehicle.interestedCount || vehicle.watchCount || 0} Wishlists</span>
                                            </div>

                                            {sold && vehicle.soldVia && (
                                                <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md font-bold">
                                                    Sold via: {vehicle.soldVia === 'direct' ? 'Direct Purchase' : vehicle.soldVia === 'live' ? 'Live Auction' : 'Bidding'}
                                                </div>
                                            )}

                                            {!sold && closed && (
                                                <div className="text-[11px] text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
                                                    Unsold at auction end
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Column: Boost & View */}
                                    <div className="flex md:flex-col justify-end md:justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-5 gap-2.5 flex-shrink-0">
                                        <button
                                            onClick={() => handleBoostClick(vehicle)}
                                            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all ${
                                                closed
                                                    ? 'bg-gray-100 text-gray-400 hover:bg-gray-200 cursor-pointer'
                                                    : vehicle.isBoosted
                                                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/20 hover:scale-105'
                                                    : 'bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white shadow-red-500/20 hover:scale-105 active:scale-95'
                                            }`}
                                        >
                                            <span>⚡</span>
                                            {closed ? "Boost (Ended)" : vehicle.isBoosted ? "Boost Again" : "Boost Post"}
                                        </button>

                                        {onSelectVehicle && (
                                            <button
                                                onClick={() => onSelectVehicle(vehicle)}
                                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors"
                                            >
                                                View Post
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ENDED VEHICLE BOOST WARNING MODAL */}
            {endedVehicleNotice && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 text-center space-y-4 animate-scale-up">
                        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto text-3xl">
                            ⚠️
                        </div>
                        <h4 className="text-xl font-black text-gray-900">Auction Period Has Ended</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                            {endedVehicleNotice}
                        </p>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-medium text-left">
                            <strong>Note:</strong> Paid boost promotions are only applicable to currently running (Active or Upcoming) auction listings to drive real-time bidder traffic.
                        </div>
                        <div className="pt-2 flex gap-3">
                            <button
                                onClick={() => {
                                    setEndedVehicleNotice(null);
                                    setPostsTab('current');
                                }}
                                className="flex-1 py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl text-xs shadow-md transition-all"
                            >
                                Go to Current Auctions
                            </button>
                            <button
                                onClick={() => setEndedVehicleNotice(null)}
                                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PAID BOOST PLANS MODAL */}
            {selectedVehicleForBoost && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden my-8 animate-scale-up">
                        
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white p-6 sm:p-7 relative">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400 flex items-center gap-1.5 mb-1">
                                        <span>⚡</span> Instant Promotion Plans
                                    </span>
                                    <h3 className="text-2xl font-black tracking-tight">Boost Vehicle Listing</h3>
                                    <p className="text-xs text-gray-400 mt-1">
                                        Promoting: <strong className="text-white">{selectedVehicleForBoost.year} {selectedVehicleForBoost.make} {selectedVehicleForBoost.model}</strong>
                                    </p>
                                </div>
                                <button 
                                    onClick={() => setSelectedVehicleForBoost(null)}
                                    className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Wallet balance chip */}
                            <div className="mt-4 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-xs border border-white/20">
                                <span className="text-gray-300">Your Wallet Balance:</span>
                                <strong className="text-green-400 font-black">₹{availableBalance.toLocaleString()}</strong>
                            </div>
                        </div>

                        {/* Modal Body: Plans */}
                        <div className="p-6 sm:p-7 space-y-6">
                            
                            {boostMessage && (
                                <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 ${
                                    boostMessage.type === 'error'
                                        ? 'bg-red-50 text-red-700 border border-red-200 animate-shake'
                                        : 'bg-green-50 text-green-700 border border-green-200'
                                }`}>
                                    <span className="text-lg">{boostMessage.type === 'error' ? '⚠️' : '✓'}</span>
                                    <div className="flex-1">{boostMessage.text}</div>
                                    {boostMessage.type === 'error' && onNavigate && (
                                        <button
                                            onClick={() => {
                                                setSelectedVehicleForBoost(null);
                                                onNavigate('settings');
                                            }}
                                            className="px-3 py-1 bg-red-600 text-white rounded-lg text-[11px] font-bold shadow-sm whitespace-nowrap"
                                        >
                                            Add Funds
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="space-y-3">
                                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                                    Select Promotion Tier
                                </label>

                                {BOOST_PLANS.map(plan => {
                                    const isSelected = selectedPlanId === plan.id;
                                    const canAfford = availableBalance >= plan.price;

                                    return (
                                        <div
                                            key={plan.id}
                                            onClick={() => setSelectedPlanId(plan.id)}
                                            className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                                                isSelected
                                                    ? 'border-red-600 bg-red-50/20 shadow-md ring-2 ring-red-100'
                                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                                        isSelected ? 'border-red-600 bg-red-600' : 'border-gray-300'
                                                    }`}>
                                                        {isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-black text-gray-900 text-base">{plan.name}</span>
                                                            <span className={`text-[10px] font-black text-white px-2 py-0.5 rounded-full bg-gradient-to-r ${plan.badgeColor}`}>
                                                                {plan.multiplier}
                                                            </span>
                                                        </div>
                                                        <span className="text-xs text-gray-500 font-medium">Duration: {plan.duration}</span>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <span className="text-xl font-black text-gray-900">₹{plan.price.toLocaleString()}</span>
                                                    <div className={`text-[10px] font-bold ${canAfford ? 'text-green-600' : 'text-red-500'}`}>
                                                        {canAfford ? 'Available' : 'Insufficient balance'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Features bullet points */}
                                            <ul className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-gray-600">
                                                {plan.features.map((feat, fidx) => (
                                                    <li key={fidx} className="flex items-center gap-1.5">
                                                        <span className="text-green-500 font-bold">✓</span> {feat}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Actions */}
                            <div className="pt-2 flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => setSelectedVehicleForBoost(null)}
                                    className="w-full sm:w-auto px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-sm transition-colors"
                                >
                                    Cancel
                                </button>

                                <button
                                    onClick={handleConfirmBoost}
                                    disabled={isBoosting}
                                    className="flex-1 py-3.5 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-extrabold rounded-xl text-sm shadow-xl shadow-red-500/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isBoosting ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Activating Boost...
                                        </>
                                    ) : (
                                        <>
                                            <span>⚡ Confirm & Activate Boost</span>
                                            <span>(₹{BOOST_PLANS.find(p => p.id === selectedPlanId)?.price})</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};

const StatCard = ({ 
    title, 
    value, 
    icon, 
    subtitle 
}: { 
    title: string; 
    value: number; 
    icon: string; 
    subtitle?: string; 
}) => (
    <div className="bg-white border border-gray-200/90 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 leading-tight">{title}</span>
            <span className="text-base sm:text-lg bg-gray-50 p-1.5 rounded-lg border border-gray-100">{icon}</span>
        </div>
        <div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">{value}</div>
            {subtitle && <p className="text-[11px] text-gray-400 mt-1 font-medium">{subtitle}</p>}
        </div>
    </div>
);
