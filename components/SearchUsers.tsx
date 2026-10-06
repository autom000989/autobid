import React, { useState, useEffect, useMemo } from 'react';
import { User, Vehicle } from '../types';
import { VehicleCard } from './VehicleCard';
import { db, collection, onSnapshot } from '../firebase';
import { VEHICLE_CATALOG, VehicleCategory, CatalogBrand } from '../constants/vehicleCatalog';

interface SearchUsersProps {
  onSearchUser: (user: User) => void;
  onSelectVehicle: (vehicle: Vehicle) => void;
  vehicles: Vehicle[];
  t: any;
  currentUser?: User;
  onFollowToggle?: (user: User) => void;
  isFollowLoading?: boolean;
  onNavigate?: (view: string) => void;
}

export const SearchUsers: React.FC<SearchUsersProps> = ({ 
  onSearchUser, 
  onSelectVehicle, 
  vehicles, 
  t,
  currentUser,
  onFollowToggle,
  isFollowLoading = false,
  onNavigate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMode, setSearchMode] = useState<'vehicles' | 'users'>('vehicles');
  const [dbUsers, setDbUsers] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Hierarchical category selection state
  const [selectedCategory, setSelectedCategory] = useState<VehicleCategory | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<CatalogBrand | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  // Fetch real registered users from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const uList: User[] = [];
      snapshot.forEach(d => {
        const u = d.data() as User;
        if (!u.isDeleted && u.suspensionStatus !== 'permanent') {
          uList.push(u);
        }
      });
      setDbUsers(uList);
      setIsLoadingUsers(false);
    }, (err) => {
      console.error("Error loading users for search:", err);
      setDbUsers([]);
      setIsLoadingUsers(false);
    });

    return () => unsub();
  }, []);

  const query = searchTerm.trim().toLowerCase();

  // Helper: Determine vehicle category
  const getVehicleCategory = (v: Vehicle): string => {
    if (v.vehicleType) {
      const vt = v.vehicleType.toLowerCase();
      if (vt.includes('bike') || vt.includes('motorcycle') || vt.includes('scooter') || vt.includes('2w')) return 'bike';
      if (vt.includes('cycle') || vt.includes('bicycle')) return 'cycle';
      if (vt.includes('three') || vt.includes('3w') || vt.includes('auto') || vt.includes('rickshaw')) return 'three-wheeler';
      if (vt.includes('10 wheel') || vt.includes('10-wheel') || vt.includes('10w')) return '10-wheelers';
      if (vt.includes('12 wheel') || vt.includes('12-wheel') || vt.includes('14 wheel') || vt.includes('16 wheel') || vt.includes('12w') || vt.includes('trailer')) return '12-wheelers';
      if (vt.includes('truck') || vt.includes('pickup') || vt.includes('lcv') || vt.includes('tipper')) return 'trucks';
      if (vt.includes('tractor') || vt.includes('farm')) return 'tractors';
      if (vt.includes('bus') || vt.includes('van') || vt.includes('traveller')) return 'buses';
      if (vt.includes('car') || vt.includes('sedan') || vt.includes('suv') || vt.includes('hatchback')) return 'cars';
    }

    const desc = `${v.make || ''} ${v.model || ''} ${v.description || ''}`.toLowerCase();

    // 12-wheelers checks
    if (desc.includes('12 wheeler') || desc.includes('12-wheel') || desc.includes('14 wheeler') || desc.includes('16 wheeler') || desc.includes('3523') || desc.includes('3525') || desc.includes('4225') || desc.includes('4825') || desc.includes('5530') || desc.includes('3520') || desc.includes('4120') || desc.includes('4220') || desc.includes('6035') || desc.includes('6042') || desc.includes('6048')) {
      return '12-wheelers';
    }

    // 10-wheelers checks
    if (desc.includes('10 wheeler') || desc.includes('10-wheel') || desc.includes('10w') || desc.includes('2823') || desc.includes('2825') || desc.includes('2830') || desc.includes('2820') || desc.includes('2822') || desc.includes('6028') || desc.includes('blazo x 28')) {
      return '10-wheelers';
    }

    // Cycle checks
    if (desc.includes('cycle') || desc.includes('bicycle') || desc.includes('mtb') || desc.includes('sprint pro') || desc.includes('firefox') || desc.includes('marlin') || desc.includes('rockrider') || desc.includes('montra') || desc.includes('hercules')) {
      return 'cycle';
    }

    // 3-wheeler checks
    if (desc.includes('rickshaw') || desc.includes('3 wheeler') || desc.includes('three wheeler') || desc.includes('maxima') || desc.includes('ape auto') || desc.includes('ape city') || desc.includes('ape xtra') || desc.includes('treo') || desc.includes('tvs king') || desc.includes('atul gem') || desc.includes('e-rickshaw')) {
      return 'three-wheeler';
    }

    // Bike checks
    if (desc.includes('motorcycle') || desc.includes('bike') || desc.includes('scooter') || desc.includes('royal enfield') || desc.includes('bullet') || desc.includes('classic 350') || desc.includes('pulsar') || desc.includes('splendor') || desc.includes('activa') || desc.includes('r15') || desc.includes('mt-15') || desc.includes('apache') || desc.includes('ktm duke') || desc.includes('jupiter') || desc.includes('access 125') || desc.includes('ninja') || desc.includes('superbike') || desc.includes('harley')) {
      return 'bike';
    }

    // Trucks checks
    if (desc.includes('truck') || desc.includes('pickup') || desc.includes('tata ace') || desc.includes('chhota hathi') || desc.includes('intra v') || desc.includes('yodha') || desc.includes('407') || desc.includes('bolero pik-up') || desc.includes('bolero maxi') || desc.includes('bada dost') || desc.includes('dost+') || desc.includes('v-cross') || desc.includes('furio') || desc.includes('eicher pro 20')) {
      return 'trucks';
    }

    // Tractors checks
    if (desc.includes('tractor') || desc.includes('john deere') || desc.includes('swaraj') || desc.includes('sonalika') || desc.includes('massey ferguson') || desc.includes('new holland') || desc.includes('novo 605')) {
      return 'tractors';
    }

    // Buses checks
    if (desc.includes('bus') || desc.includes('coach') || desc.includes('traveller') || desc.includes('urbania') || desc.includes('starbus') || desc.includes('winger')) {
      return 'buses';
    }

    return 'cars';
  };

  // Helper: Check brand match
  const matchesBrand = (vehicle: Vehicle, brand: CatalogBrand): boolean => {
    const vMake = (vehicle.make || '').toLowerCase();
    const bName = brand.name.toLowerCase();
    const bId = brand.id.toLowerCase();
    
    if (vMake.includes(bName) || bName.includes(vMake)) return true;
    if (bId.includes('maruti') && vMake.includes('maruti')) return true;
    if (bId.includes('hyundai') && vMake.includes('hyundai')) return true;
    if (bId.includes('tata') && vMake.includes('tata')) return true;
    if (bId.includes('mahindra') && vMake.includes('mahindra')) return true;
    if (bId.includes('toyota') && vMake.includes('toyota')) return true;
    if (bId.includes('honda') && vMake.includes('honda')) return true;
    if (bId.includes('royal-enfield') && (vMake.includes('royal') || vMake.includes('enfield'))) return true;
    if (bId.includes('yamaha') && vMake.includes('yamaha')) return true;
    if (bId.includes('bajaj') && vMake.includes('bajaj')) return true;
    if (bId.includes('hero') && vMake.includes('hero')) return true;
    if (bId.includes('tvs') && vMake.includes('tvs')) return true;
    if (bId.includes('ktm') && vMake.includes('ktm')) return true;
    if (bId.includes('bmw') && vMake.includes('bmw')) return true;
    if (bId.includes('mercedes') && (vMake.includes('mercedes') || vMake.includes('benz'))) return true;
    if (bId.includes('audi') && vMake.includes('audi')) return true;
    if (bId.includes('ashok-leyland') && (vMake.includes('ashok') || vMake.includes('leyland'))) return true;
    if (bId.includes('bharatbenz') && vMake.includes('bharat')) return true;
    if (bId.includes('eicher') && vMake.includes('eicher')) return true;
    if (bId.includes('piaggio') && (vMake.includes('piaggio') || vMake.includes('ape'))) return true;
    if (bId.includes('volvo') && vMake.includes('volvo')) return true;

    return false;
  };

  // Helper: Check model match
  const matchesModel = (vehicle: Vehicle, modelName: string): boolean => {
    const vModel = (vehicle.model || '').toLowerCase();
    const mName = modelName.toLowerCase();
    
    if (vModel.includes(mName) || mName.includes(vModel)) return true;
    const primaryToken = mName.split(' ')[0];
    if (primaryToken.length > 2 && vModel.includes(primaryToken)) return true;

    return false;
  };

  // Pre-calculate vehicle counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    VEHICLE_CATALOG.forEach(cat => { counts[cat.id] = 0; });
    vehicles.forEach(v => {
      const catId = getVehicleCategory(v);
      counts[catId] = (counts[catId] || 0) + 1;
    });
    return counts;
  }, [vehicles]);

  // Pre-calculate vehicle counts per brand in selected category
  const brandCounts = useMemo(() => {
    if (!selectedCategory) return {};
    const counts: Record<string, number> = {};
    const catVehicles = vehicles.filter(v => getVehicleCategory(v) === selectedCategory.id);
    selectedCategory.brands.forEach(b => {
      counts[b.id] = catVehicles.filter(v => matchesBrand(v, b)).length;
    });
    return counts;
  }, [selectedCategory, vehicles]);

  // Pre-calculate vehicle counts per model in selected brand
  const modelCounts = useMemo(() => {
    if (!selectedBrand || !selectedCategory) return {};
    const counts: Record<string, number> = {};
    const brandVehicles = vehicles.filter(v => 
      getVehicleCategory(v) === selectedCategory.id && matchesBrand(v, selectedBrand)
    );
    selectedBrand.models.forEach(m => {
      counts[m] = brandVehicles.filter(v => matchesModel(v, m)).length;
    });
    return counts;
  }, [selectedBrand, selectedCategory, vehicles]);

  // Listed vehicles matching current drilldown
  const activeDrilldownVehicles = useMemo(() => {
    if (!selectedCategory) return [];
    let list = vehicles.filter(v => getVehicleCategory(v) === selectedCategory.id);
    if (selectedBrand) {
      list = list.filter(v => matchesBrand(v, selectedBrand));
    }
    if (selectedModel) {
      list = list.filter(v => matchesModel(v, selectedModel));
    }
    return list;
  }, [selectedCategory, selectedBrand, selectedModel, vehicles]);

  // Filtered lists for text search
  const filteredUsers = query
    ? dbUsers.filter(u => 
        (u.username || '').toLowerCase().includes(query) || 
        (u.fullName || '').toLowerCase().includes(query) ||
        (u.email || '').toLowerCase().includes(query) ||
        (u.bio || '').toLowerCase().includes(query)
      )
    : dbUsers;

  const filteredVehicles = query
    ? vehicles.filter(v => 
        (v.make || '').toLowerCase().includes(query) || 
        (v.model || '').toLowerCase().includes(query) ||
        (v.vin || '').toLowerCase().includes(query) ||
        (v.ownerUsername || '').toLowerCase().includes(query) ||
        (v.location || '').toLowerCase().includes(query)
      )
    : vehicles;

  // Handle drilldown navigation step-backs
  const handleResetToCategories = () => {
    setSelectedCategory(null);
    setSelectedBrand(null);
    setSelectedModel(null);
  };

  const handleResetToBrands = () => {
    setSelectedBrand(null);
    setSelectedModel(null);
  };

  const handleResetToModels = () => {
    setSelectedModel(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 animate-fade-in-up pb-28 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <span>🔍</span>
            <span>Explore & Search Vehicles</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Browse by categories (Bikes, Cycles, 3-Wheelers, Cars, Trucks, 10-Wheelers, 12-Wheelers) or search directly
          </p>
        </div>

        {onNavigate && (
          <button
            onClick={() => onNavigate('sell')}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold text-xs shadow-md shadow-red-500/20 hover:brightness-105 transition-all flex items-center gap-1.5"
          >
            <span>➕</span>
            <span>List Your Vehicle</span>
          </button>
        )}
      </div>
      
      {/* Search Mode Toggle Tabs */}
      <div className="flex p-1 bg-gray-100/90 rounded-2xl max-w-md border border-gray-200">
        <button 
          onClick={() => {
            setSearchMode('vehicles');
          }}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
            searchMode === 'vehicles' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <span>🚗</span>
          <span>Vehicles ({vehicles.length})</span>
        </button>
        <button 
          onClick={() => {
            setSearchMode('users');
          }}
          className={`flex-1 py-2.5 text-xs sm:text-sm font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
            searchMode === 'users' 
              ? 'bg-white text-gray-900 shadow-sm' 
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <span>👥</span>
          <span>User Profiles ({filteredUsers.length})</span>
        </button>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <input 
          type="text"
          placeholder={
            searchMode === 'vehicles'
              ? "Search by make, model, year, VIN, location or keyword (e.g. Swift, Classic 350, 10 Wheeler)..."
              : "Search profiles by username, name, or email..."
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-12 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all placeholder:text-gray-400 font-medium"
        />
        <div className="absolute left-4 top-4 text-gray-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* USER PROFILES SEARCH MODE                                                 */}
      {/* ========================================================================= */}
      {searchMode === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              {query ? `Search Results (${filteredUsers.length})` : `All Community Profiles (${filteredUsers.length})`}
            </span>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <p className="font-bold text-gray-800">No profiles found</p>
              <p className="text-xs text-gray-400 mt-1">Try searching with a different username or keyword.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {filteredUsers.map(user => {
                const isMe = Boolean(currentUser?.id && user.id === currentUser.id);
                const isFollowing = Boolean(currentUser?.followingIds?.includes(user.id));
                const followsMe = Boolean(
                  (user.followingIds && currentUser?.id && user.followingIds.includes(currentUser.id)) ||
                  (currentUser?.followersIds && currentUser.followersIds.includes(user.id))
                );

                return (
                  <div 
                    key={user.id} 
                    onClick={() => onSearchUser(user)}
                    className="bg-white border border-gray-100 p-4 rounded-2xl flex items-center justify-between gap-3 cursor-pointer hover:shadow-md hover:border-gray-200 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <img 
                        src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} 
                        alt={user.username} 
                        className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover group-hover:scale-105 transition-transform shrink-0" 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-bold text-gray-900 text-xs sm:text-sm truncate group-hover:text-red-600 transition-colors">@{user.username}</h3>
                          {user.isVerified && (
                            <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                          {followsMe && (
                            <span className="text-[9px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded-md border border-blue-100">
                              Follows you
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">{user.fullName || 'AutoBid Member'}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                          <span>{user.followers || 0} followers</span>
                          {user.role && user.role !== 'user' && (
                            <span className="uppercase font-bold px-1.5 py-0.2 rounded bg-gray-100 text-gray-600">
                              {user.role}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!isMe && onFollowToggle && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFollowToggle(user);
                        }}
                        disabled={isFollowLoading}
                        className={`shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-xs flex items-center gap-1 ${
                          isFollowing
                            ? 'bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 border border-gray-200'
                            : followsMe
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-200 ring-2 ring-blue-400/20'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isFollowing ? 'Following' : followsMe ? 'Follow Back' : 'Follow'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VEHICLES SEARCH & CATEGORY DRILLDOWN MODE                                 */}
      {/* ========================================================================= */}
      {searchMode === 'vehicles' && (
        <div className="space-y-6">
          {/* If the user has typed an active text query, show direct search results */}
          {query ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Search Results for "{searchTerm}" ({filteredVehicles.length})
                </span>
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-xs text-red-600 font-bold hover:underline"
                >
                  Clear Search & Browse Categories
                </button>
              </div>

              {filteredVehicles.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 p-8 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto text-2xl">
                    🔍
                  </div>
                  <h3 className="text-lg font-black text-gray-900">No vehicles matching "{searchTerm}"</h3>
                  <p className="text-xs text-gray-500 max-w-md mx-auto">
                    Try searching for another make (e.g. Maruti, Tata, Royal Enfield), or browse our vehicle categories below.
                  </p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl"
                  >
                    View All Categories
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredVehicles.map(vehicle => (
                    <VehicleCard 
                      key={vehicle.id}
                      vehicle={vehicle}
                      onClick={() => onSelectVehicle(vehicle)}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* HIERARCHICAL DRILLDOWN BROWSER */
            <div className="space-y-6">
              {/* Interactive Breadcrumb Navigation Trail */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
                  <button
                    onClick={handleResetToCategories}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                      !selectedCategory ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <span>🚗</span>
                    <span>All Vehicle Types</span>
                  </button>

                  {selectedCategory && (
                    <>
                      <span className="text-gray-300">/</span>
                      <button
                        onClick={handleResetToBrands}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                          !selectedBrand ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <span>{selectedCategory.icon}</span>
                        <span>{selectedCategory.shortName}</span>
                      </button>
                    </>
                  )}

                  {selectedBrand && (
                    <>
                      <span className="text-gray-300">/</span>
                      <button
                        onClick={handleResetToModels}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                          !selectedModel ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        <span>{selectedBrand.icon || '🏷️'}</span>
                        <span>{selectedBrand.name}</span>
                      </button>
                    </>
                  )}

                  {selectedModel && (
                    <>
                      <span className="text-gray-300">/</span>
                      <span className="bg-red-600 text-white px-2.5 py-1 rounded-lg">
                        {selectedModel}
                      </span>
                    </>
                  )}
                </div>

                {selectedCategory && (
                  <button
                    onClick={handleResetToCategories}
                    className="text-xs text-gray-500 hover:text-gray-900 font-bold"
                  >
                    Reset Filter
                  </button>
                )}
              </div>

              {/* =============================================================== */}
              {/* LEVEL 1: ALL VEHICLE CATEGORIES (Bike, Cycle, 3-Wheeler, Cars, Trucks, 10-Wheelers, 12-Wheelers) */}
              {/* =============================================================== */}
              {!selectedCategory && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-black text-gray-900">Select Vehicle Category</h3>
                      <p className="text-xs text-gray-500">Pick a vehicle category to browse brands and models</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {VEHICLE_CATALOG.map(category => {
                      const count = categoryCounts[category.id] || 0;
                      return (
                        <div
                          key={category.id}
                          onClick={() => {
                            setSelectedCategory(category);
                            setSelectedBrand(null);
                            setSelectedModel(null);
                          }}
                          className="bg-white border-2 border-gray-100 hover:border-gray-900 p-4 rounded-3xl shadow-xs hover:shadow-md cursor-pointer transition-all group flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-3xl p-2 rounded-2xl bg-gray-50 group-hover:scale-110 transition-transform">
                                {category.icon}
                              </span>
                              <span className="text-[10px] font-black uppercase text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                {category.wheelCount}
                              </span>
                            </div>

                            <div>
                              <h4 className="text-sm font-black text-gray-900 group-hover:text-red-600 transition-colors">
                                {category.name}
                              </h4>
                              <p className="text-[11px] text-gray-500 line-clamp-2 mt-1">
                                {category.description}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-[11px] font-bold text-gray-400">
                              {category.brands.length} Brands
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              count > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {count > 0 ? `${count} Listed` : 'Browse'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* =============================================================== */}
              {/* LEVEL 2: BRANDS GRID UNDER SELECTED VEHICLE TYPE                 */}
              {/* =============================================================== */}
              {selectedCategory && !selectedBrand && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{selectedCategory.icon}</span>
                      <div>
                        <h3 className="text-lg font-black text-gray-900">
                          {selectedCategory.name} Brands
                        </h3>
                        <p className="text-xs text-gray-500">
                          Select a manufacturer brand to view its available models
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleResetToCategories}
                      className="self-start sm:self-auto text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <span>←</span>
                      <span>Change Vehicle Type</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {selectedCategory.brands.map(brand => {
                      const count = brandCounts[brand.id] || 0;
                      return (
                        <div
                          key={brand.id}
                          onClick={() => {
                            setSelectedBrand(brand);
                            setSelectedModel(null);
                          }}
                          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                            count > 0
                              ? 'bg-white border-gray-200 hover:border-emerald-600 hover:shadow-md'
                              : 'bg-gray-50/70 border-gray-200 hover:border-gray-900 hover:bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xl">{brand.icon || '🏷️'}</span>
                              {brand.country && (
                                <span className="text-[10px] font-bold text-gray-400">
                                  {brand.country}
                                </span>
                              )}
                            </div>
                            <h4 className="font-black text-xs sm:text-sm text-gray-900 leading-snug">
                              {brand.name}
                            </h4>
                            <p className="text-[10px] text-gray-400 mt-0.5">
                              {brand.models.length} Models
                            </p>
                          </div>

                          <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              count > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-200 text-gray-600'
                            }`}>
                              {count > 0 ? `${count} Available` : '0 Available'}
                            </span>
                            <span className="text-xs text-gray-300">→</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* =============================================================== */}
              {/* LEVEL 3: MODELS GRID UNDER SELECTED BRAND                        */}
              {/* =============================================================== */}
              {selectedCategory && selectedBrand && !selectedModel && (
                <div className="space-y-6">
                  {/* Brand Level Banner & Availability Notification */}
                  <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl shadow-inner">
                          {selectedBrand.icon || '🏷️'}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-black text-gray-900">{selectedBrand.name}</h3>
                            <span className="text-xs text-gray-400">({selectedCategory.shortName})</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            Select a vehicle model to view active listings on AutoBid
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleResetToBrands}
                          className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors"
                        >
                          ← Change Brand
                        </button>
                      </div>
                    </div>

                    {/* BRAND AVAILABILITY NOTICE (If no vehicle of this brand is listed) */}
                    {(brandCounts[selectedBrand.id] || 0) === 0 && (
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span className="text-lg">ℹ️</span>
                          <div>
                            <strong className="block font-black text-amber-950">
                              No vehicle of {selectedBrand.name} is currently available
                            </strong>
                            <span>
                              No user has listed a {selectedBrand.name} in the {selectedCategory.name} category yet. You can list yours below or browse individual models.
                            </span>
                          </div>
                        </div>
                        {onNavigate && (
                          <button
                            onClick={() => onNavigate('sell')}
                            className="shrink-0 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors"
                          >
                            List a {selectedBrand.name}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Models Grid */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        {selectedBrand.name} Models ({selectedBrand.models.length})
                      </h4>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {selectedBrand.models.map(model => {
                        const count = modelCounts[model] || 0;
                        return (
                          <div
                            key={model}
                            onClick={() => setSelectedModel(model)}
                            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                              count > 0
                                ? 'bg-white border-emerald-500 shadow-md ring-1 ring-emerald-200'
                                : 'bg-white border-gray-200 hover:border-gray-900 hover:shadow-xs'
                            }`}
                          >
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 block uppercase">Model</span>
                              <h5 className="font-black text-xs sm:text-sm text-gray-900 mt-0.5 leading-snug">
                                {model}
                              </h5>
                            </div>

                            <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                count > 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-gray-100 text-gray-500'
                              }`}>
                                {count > 0 ? `${count} Available` : 'Check Model'}
                              </span>
                              <span className="text-xs text-gray-300">→</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* =============================================================== */}
              {/* LEVEL 4: LISTED VEHICLES FOR SELECTED MODEL                     */}
              {/* =============================================================== */}
              {selectedCategory && selectedBrand && selectedModel && (
                <div className="space-y-6">
                  <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{selectedCategory.icon}</span>
                        <h3 className="text-lg font-black text-gray-900">
                          {selectedBrand.name} {selectedModel}
                        </h3>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Category: {selectedCategory.name} • Brand: {selectedBrand.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleResetToModels}
                        className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors"
                      >
                        ← Other Models
                      </button>
                      <button
                        onClick={handleResetToBrands}
                        className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-colors"
                      >
                        ← Other Brands
                      </button>
                    </div>
                  </div>

                  {/* Check Availability of that Model */}
                  {activeDrilldownVehicles.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-gray-200 p-8 text-center space-y-4 shadow-sm">
                      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto text-2xl shadow-inner">
                        🚫
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="text-lg font-black text-gray-900">
                          No vehicle of {selectedBrand.name} {selectedModel} is available
                        </h4>
                        <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
                          Currently, no user has listed a <strong>{selectedBrand.name} {selectedModel}</strong> on AutoBid. You can list yours to start an auction, or explore other models from {selectedBrand.name}.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                        {onNavigate && (
                          <button
                            onClick={() => onNavigate('sell')}
                            className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 text-white text-xs font-black rounded-xl shadow-md shadow-red-500/20 hover:brightness-105 transition-all"
                          >
                            List a {selectedBrand.name} {selectedModel}
                          </button>
                        )}
                        <button
                          onClick={handleResetToModels}
                          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-colors"
                        >
                          Browse Other {selectedBrand.name} Models
                        </button>
                        <button
                          onClick={handleResetToBrands}
                          className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-colors"
                        >
                          Explore Other Brands
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Matching Listed Vehicles */
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                          Active Listings ({activeDrilldownVehicles.length})
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {activeDrilldownVehicles.map(vehicle => (
                          <VehicleCard 
                            key={vehicle.id}
                            vehicle={vehicle}
                            onClick={() => onSelectVehicle(vehicle)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
