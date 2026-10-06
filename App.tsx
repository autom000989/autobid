import { DashboardView } from './components/ManageDashboard';
import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { VehicleCard } from './components/VehicleCard';
import { VehicleDetail } from './components/VehicleDetail';
import { BottomNav } from './components/BottomNav';
import { Auth } from './components/Auth';
import { SellCar } from './components/SellCar';
import { Settings } from './components/Settings';
import { SearchUsers } from './components/SearchUsers';
import { AdminPanel } from './components/AdminPanel';
import { HelpSupport } from './components/HelpSupport';
import { WalletView } from './components/WalletView';
import { IdentityVerificationModal } from './components/IdentityVerificationModal';
import { VehicleCardSkeleton, VehicleDetailSkeleton, DashboardSkeleton } from './components/Skeletons';
import { Vehicle, User, VehicleStatus } from './types';
import { TRANSLATIONS } from './constants';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, query, where, doc, updateDoc, setDoc, getDocs, getDoc, arrayUnion, arrayRemove, increment, addDoc } from 'firebase/firestore';
import { sanitizeInstagramUsername } from './utils/username';
import { liveApi } from './services/liveApi';

type ViewState = 'home' | 'detail' | 'profile' | 'auth' | 'sell' | 'settings' | 'search' | 'admin' | 'deleted' | 'support' | 'wallet';
type AuctionFilter = 'all' | 'live' | 'upcoming' | 'for_sale';
type ProfileTab = 'auctions' | 'watchlist' | 'won' | 'lost' | 'dashboard';

export const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [settingsSection, setSettingsSection] = useState<any>(undefined);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState('English (US)');
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Profile State
  const [profileUser, setProfileUser] = useState<User | null>(null); // User currently being viewed
  const [profileTab, setProfileTab] = useState<ProfileTab>('auctions');
  const [profileListedFilter, setProfileListedFilter] = useState<'all' | 'auction' | 'direct'>('all');
  
  const [auctionFilter, setAuctionFilter] = useState<AuctionFilter>('all');
  const [isLoading, setIsLoading] = useState(true);

  // User Bidding History State (for Won & Lost profile tracking)
  const [allBids, setAllBids] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveFilter, setArchiveFilter] = useState<'all' | 'listings' | 'bids'>('all');
  const [showFollowModal, setShowFollowModal] = useState<'followers' | 'following' | null>(null);
  const [showDiscoverDrawer, setShowDiscoverDrawer] = useState(false);
  const [discoverSearch, setDiscoverSearch] = useState('');
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // 100% Live Server-backed User Bids (replaces localStorage & cookies completely)
  const [userBidVehicleIds, setUserBidVehicleIds] = useState<string[]>([]);

  useEffect(() => {
    if (currentUser?.id) {
      // Fetch live bids from Node.js backend
      liveApi.getUserBids(currentUser.id).then(res => {
        if (res && res.vehicleIds) {
          setUserBidVehicleIds(res.vehicleIds);
        }
      }).catch(e => {
        console.warn("[App] Live bids fetch from Node.js backend warning:", e);
      });

      // Sync active user to Node.js backend
      liveApi.syncUser(currentUser).catch(console.warn);
    }
  }, [currentUser?.id]);

  // Translations
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS['English (US)'];

  const [notifications, setNotifications] = useState<any[]>([]);

  // Dynamically synchronize vehicle ownership whenever currentUser changes
  useEffect(() => {
    if (!currentUser?.id) return;
    setVehicles(prev => prev.map(v => ({
      ...v,
      isOwner: Boolean(currentUser.id && v.ownerId === currentUser.id)
    })));
  }, [currentUser?.id]);

  // Listen to Auth State
  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;
    let unsubNotifs: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubUserDoc) {
        unsubUserDoc();
        unsubUserDoc = null;
      }
      if (unsubNotifs) {
        unsubNotifs();
        unsubNotifs = null;
      }

      if (user) {
        setIsAuthenticated(true);
        const userDocRef = doc(db, 'users', user.uid);
        
        unsubUserDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as User;
            setCurrentUser(userData);
            // Default profile to self on login unless viewing someone else
            setProfileUser(prev => (!prev || prev.id === userData.id) ? userData : prev);
            if (userData.suspensionStatus === 'temporary' || userData.suspensionStatus === 'permanent' || userData.isDeleted) {
              setCurrentView('deleted');
            } else if (currentView === 'deleted') {
              setCurrentView('home');
            }
          } else {
            const isSpecialAdmin = user.email === 'mmwajnnd@gmail.com' || user.email === 'tingurang931@gmail.com';
            const rawUsername = user.displayName || user.email?.split('@')[0] || `user_${Math.floor(Math.random() * 10000)}`;
            const cleanUsername = sanitizeInstagramUsername(rawUsername) || `user_${Math.floor(Math.random() * 10000)}`;
            const newUser: User = {
              id: user.uid,
              email: user.email || undefined,
              username: cleanUsername,
              fullName: user.displayName || user.email?.split('@')[0] || 'User',
              avatarUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
              isVerified: isSpecialAdmin,
              verificationStatus: isSpecialAdmin ? 'verified' : 'unverified',
              followers: 0,
              following: 0,
              followingIds: [],
              followersIds: [],
              bio: 'New member at AutoBid.',
              role: isSpecialAdmin ? 'admin' : 'user',
              deposits: 0,
              createdAt: Date.now(),
              isDeleted: false,
              suspensionStatus: 'none',
              totalCommissionPaid: 0
            };
            setDoc(userDocRef, newUser).catch(err => console.error('Error creating user doc:', err));
            setDoc(doc(db, 'usernames', cleanUsername), { uid: user.uid }).catch(err => console.error('Error claiming username:', err));
          }
        }, (err) => {
          console.error('User fetch error:', err);
        });

        const notifQ = query(collection(db, 'notifications'), where('userId', '==', user.uid), where('read', '==', false));
        unsubNotifs = onSnapshot(notifQ, (snap) => {
          const notifs: any[] = [];
          snap.forEach(d => notifs.push({ id: d.id, ...d.data() }));
          setNotifications(notifs);
        }, (err) => {
          console.error('Notifications fetch error:', err);
        });
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setProfileUser(null);
        setNotifications([]);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubUserDoc) unsubUserDoc();
      if (unsubNotifs) unsubNotifs();
    };
  }, []);

  // Listen to Firestore Vehicles
  useEffect(() => {
    const vehiclesCol = collection(db, 'vehicles');

    const unsubscribe = onSnapshot(vehiclesCol, (snapshot) => {
      const vehiclesData: Vehicle[] = [];
      const currentUid = auth.currentUser?.uid;
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        vehiclesData.push({ 
          ...d, 
          id: docSnap.id || d.id,
          isOwner: Boolean(currentUid && d.ownerId === currentUid)
        } as Vehicle);
      });
      // Sort: live auctions ending soonest first, upcoming by startTime
      setVehicles(vehiclesData.sort((a, b) => {
        const now = Date.now();
        const aIsUpcoming = (a.startTime && a.startTime > now) || a.status === 'Upcoming';
        const bIsUpcoming = (b.startTime && b.startTime > now) || b.status === 'Upcoming';
        if (aIsUpcoming && !bIsUpcoming) return 1;
        if (!aIsUpcoming && bIsUpcoming) return -1;
        return a.endTime - b.endTime;
      }));
      setSelectedVehicle(prev => {
        if (!prev) return null;
        const updated = vehiclesData.find(v => v.id === prev.id);
        return updated || prev;
      });
      setIsLoading(false);
    }, (err) => console.error("Vehicles fetch error:", err));

    const bidsCol = collection(db, 'bids');
    const unsubBids = onSnapshot(bidsCol, (snapshot) => {
      const bList: any[] = [];
      snapshot.forEach((doc) => {
        bList.push({ id: doc.id, ...doc.data() });
      });
      setAllBids(bList);
    }, (err) => console.warn("Bids listener error:", err));

    const usersCol = collection(db, 'users');
    const unsubUsers = onSnapshot(usersCol, (snapshot) => {
      const uList: User[] = [];
      snapshot.forEach((doc) => {
        uList.push(doc.data() as User);
      });
      setAllUsers(uList);
    }, (err) => console.warn("Users listener error:", err));

    return () => {
      unsubscribe();
      unsubBids();
      unsubUsers();
    };
  }, []);

  const handleLoginSuccess = (userData?: { username: string, uid: string }) => {
      // Handled by onAuthStateChanged observer
      setCurrentView('home');
  };

  const handleLogout = async () => {
      await signOut(auth);
      setCurrentView('home');
  };

  const navigate = (view: string) => {
    if (view === 'dashboard') {
        setProfileUser(currentUser);
        setProfileTab('auctions');
        handleViewChange('profile');
        return;
    }
    if (view === 'wallet') {
        handleViewChange('wallet');
        return;
    }
    if (view === 'settings') {
        setSettingsSection('MENU');
        handleViewChange('settings');
        return;
    }
    setSettingsSection(undefined);
    if (view === 'profile') {
        setProfileUser(currentUser);
    }
    handleViewChange(view as ViewState);
  };

  const handleViewChange = (view: ViewState) => {
    setCurrentView(view);
    window.scrollTo(0, 0);
  }

  const handleVehicleClick = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    navigate('detail');
  };

  const handleBackToHome = () => {
    setSelectedVehicle(null);
    navigate('home');
  };

  const handleMarkSold = async () => {
    if (!selectedVehicle) return;
    try {
       const vehicleRef = doc(db, 'vehicles', selectedVehicle.id);
       const commission = selectedVehicle.currentBid * 0.001; // 0.1%
       
       await updateDoc(vehicleRef, {
          status: 'Sold',
          finalSoldPrice: selectedVehicle.currentBid,
          commissionAmount: commission,
          isConcluded: true
       });

       if (selectedVehicle.ownerId) {
          const userRef = doc(db, 'users', selectedVehicle.ownerId);
          const uDoc = await getDoc(userRef);
          if (uDoc.exists()) {
             const uData = uDoc.data() as User;
             await updateDoc(userRef, {
                totalCommissionPaid: (uData.totalCommissionPaid || 0) + commission,
                deposits: (uData.deposits || 0) - commission
             });
          }
       }

       // Notify winning bidder (Won Auction)
       if (selectedVehicle.winningUserId) {
         await addDoc(collection(db, 'notifications'), {
           userId: selectedVehicle.winningUserId,
           type: 'auction_won',
           title: 'You Won the Auction! 🏆',
           message: `Congratulations! The seller concluded the live auction and you won ${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model} with the winning bid of ₹${selectedVehicle.currentBid.toLocaleString()}!`,
           createdAt: Date.now(),
           read: false,
           channel: 'email',
           link: 'vehicle_' + selectedVehicle.id
         });
       }

       // Notify other bidders who participated in live auction that they lost
       const otherLiveBidders = (selectedVehicle.liveParticipants || []).filter(
         uid => uid !== selectedVehicle.winningUserId && uid !== selectedVehicle.ownerId
       );
       for (const loserId of otherLiveBidders) {
         await addDoc(collection(db, 'notifications'), {
           userId: loserId,
           type: 'auction_lost',
           title: 'Auction Concluded — Outbid 🏁',
           message: `The live auction for ${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model} has concluded. @${selectedVehicle.winningUsername || 'Another participant'} won with a higher stake of ₹${selectedVehicle.currentBid.toLocaleString()}.`,
           createdAt: Date.now(),
           read: false,
           channel: 'email',
           link: 'vehicle_' + selectedVehicle.id
         });
       }

       setSelectedVehicle({ ...selectedVehicle, status: 'Sold', finalSoldPrice: selectedVehicle.currentBid, commissionAmount: commission, isConcluded: true } as any);
       alert(`Vehicle marked as sold! Commission of ₹${commission.toLocaleString()} deducted from owner's wallet.`);
    } catch (err: any) {
       console.error("Error marking sold: ", err);
       alert("Error: " + err.message);
    }
  };

  // Auction Lifecycle Manager:
  // 1. Monitors upcoming auctions and automatically transitions them to LIVE when startTime is reached
  //    Designates the last pre-bidder as 1st bidder in live auction and sends notifications & emails
  // 2. Monitors live auctions and automatically concludes them when endTime is reached, marking winner as Won and outbid participants as Lost
  useEffect(() => {
    const checkUpcomingTransitions = async () => {
      const now = Date.now();
      for (const v of vehicles) {
        if (!v.id) continue;
        
        const isDirect = v.listingType === 'direct' || v.status === 'Direct Sale' || (v.status as any) === 'Direct Sale';
        if (isDirect) {
          // Direct Sale Auto-Blacklist Check (3 months = 90 days max)
          if (!v.isBlacklisted && v.status !== 'Blacklisted' && v.status !== 'Sold') {
            const isExpired = (v.expiresAt && v.expiresAt <= now) || 
              (v.listedAt && (now - v.listedAt > 90 * 24 * 60 * 60 * 1000));
            if (isExpired) {
              try {
                await updateDoc(doc(db, 'vehicles', v.id), {
                  status: 'Blacklisted',
                  isBlacklisted: true
                });
                if (v.ownerId) {
                  await addDoc(collection(db, 'notifications'), {
                    userId: v.ownerId,
                    type: 'vehicle_blacklisted',
                    title: 'Vehicle Blacklisted (3-Month Limit) ⚠️',
                    message: `Your direct sale listing for ${v.year} ${v.make} ${v.model} reached the 3-month limit without being sold and has been blacklisted.`,
                    createdAt: now,
                    read: false,
                    link: 'vehicle_' + v.id
                  });
                }
              } catch (e) {
                console.error("Error auto-blacklisting direct sale vehicle:", e);
              }
            }
          }
          continue;
        }

        // AUCTION LOGIC:
        // Transition Upcoming -> LIVE when start time is reached
        if (!v.hasStartedLive && v.startTime && v.startTime <= now && v.status !== 'Sold') {
          const upcomingBids = v.upcomingBids || [];
          const lastPreBidder = upcomingBids.length > 0 ? upcomingBids[upcomingBids.length - 1] : null;
          const askingPrice = v.startingPrice || v.currentBid;

          const updates: Partial<Vehicle> & Record<string, any> = {
            status: VehicleStatus.LIVE,
            hasStartedLive: true,
          };

          if (lastPreBidder) {
            updates.firstBidderId = lastPreBidder.userId;
            updates.firstBidderUsername = lastPreBidder.username;
            updates.winningUserId = lastPreBidder.userId;
            updates.winningUsername = lastPreBidder.username;
            updates.currentBid = askingPrice;
            updates.liveParticipants = [lastPreBidder.userId];
            updates.bidUserIds = [lastPreBidder.userId];

            try {
              // Record 1st live bid in bids collection
              await addDoc(collection(db, 'bids'), {
                vehicleId: v.id,
                userId: lastPreBidder.userId,
                username: lastPreBidder.username,
                amount: askingPrice,
                timestamp: now,
                type: 'first_bidder_from_upcoming'
              });

              // Notify the 1st bidder (in-app + email notification)
              await addDoc(collection(db, 'notifications'), {
                userId: lastPreBidder.userId,
                type: 'auction_start',
                title: 'You are the 1st Bidder! 🏆',
                message: `The auction for ${v.year} ${v.make} ${v.model} is now LIVE! As the last pre-bidder, you hold the opening lead at ₹${askingPrice.toLocaleString()}.`,
                createdAt: now,
                read: false,
                channel: 'email',
                link: 'vehicle_' + v.id
              });

              // Notify all other pre-bidders who participated in the upcoming auction
              const otherPreBidders = upcomingBids.filter(b => b.userId !== lastPreBidder.userId);
              for (const other of otherPreBidders) {
                await addDoc(collection(db, 'notifications'), {
                  userId: other.userId,
                  type: 'auction_start',
                  title: 'Auction is Live! 🔴',
                  message: `The auction for ${v.year} ${v.make} ${v.model} has started! Leading bid is ₹${askingPrice.toLocaleString()} by @${lastPreBidder.username}. Place your live bid to participate!`,
                  createdAt: now,
                  read: false,
                  channel: 'email',
                  link: 'vehicle_' + v.id
                });
              }
            } catch (e) {
              console.warn("Could not dispatch transition bid or notification", e);
            }
          }

          // Notify owner that auction is live
          if (v.ownerId) {
            try {
              await addDoc(collection(db, 'notifications'), {
                userId: v.ownerId,
                type: 'auction_live',
                title: 'Your Auction is Now Live! 🔴',
                message: `Your listing for ${v.year} ${v.make} ${v.model} is now live for competitive bidding!`,
                createdAt: now,
                read: false,
                channel: 'email',
                link: 'vehicle_' + v.id
              });
            } catch (e) {
              console.warn("Could not notify owner of live auction", e);
            }
          }

          try {
            await updateDoc(doc(db, 'vehicles', v.id), updates);
          } catch (e) {
            console.error("Error updating live transition in Firestore:", e);
          }
        }

        // Auction Conclusion: When end time is reached, determine Won vs Lost
        if (v.endTime && v.endTime <= now && v.status !== 'Sold' && !(v as any).isConcluded) {
          const isSold = Boolean(v.winningUserId && v.currentBid > 0);
          const conclusionStatus = isSold ? 'Sold' : 'Ended';

          const conclusionUpdates: Partial<Vehicle> & Record<string, any> = {
            status: conclusionStatus as any,
            isConcluded: true,
            concludedAt: now,
          };
          if (isSold) {
            conclusionUpdates.finalSoldPrice = v.currentBid;
          }

          try {
            await updateDoc(doc(db, 'vehicles', v.id), conclusionUpdates);

            if (isSold && v.winningUserId) {
              // Notify Winner
              await addDoc(collection(db, 'notifications'), {
                userId: v.winningUserId,
                type: 'auction_won',
                title: 'You Won the Live Auction! 🏆',
                message: `Congratulations @${v.winningUsername}! You won the competitive live auction for ${v.year} ${v.make} ${v.model} with winning stake ₹${v.currentBid.toLocaleString()}!`,
                createdAt: now,
                read: false,
                channel: 'email',
                link: 'vehicle_' + v.id
              });

              // Notify Losers (all other live participants who placed a bid)
              const participants = (v.liveParticipants || []).filter(
                uid => uid !== v.winningUserId && uid !== v.ownerId
              );
              for (const loserId of participants) {
                await addDoc(collection(db, 'notifications'), {
                  userId: loserId,
                  type: 'auction_lost',
                  title: 'Live Auction Concluded — Outbid 🏁',
                  message: `The competitive live auction for ${v.year} ${v.make} ${v.model} has concluded. @${v.winningUsername} won with a higher stake of ₹${v.currentBid.toLocaleString()}.`,
                  createdAt: now,
                  read: false,
                  channel: 'email',
                  link: 'vehicle_' + v.id
                });
              }

              // Notify Owner
              if (v.ownerId) {
                await addDoc(collection(db, 'notifications'), {
                  userId: v.ownerId,
                  type: 'auction_sold',
                  title: 'Auction Concluded & Sold! 🎊',
                  message: `Your vehicle ${v.year} ${v.make} ${v.model} was won by @${v.winningUsername} for ₹${v.currentBid.toLocaleString()}!`,
                  createdAt: now,
                  read: false,
                  channel: 'email',
                  link: 'vehicle_' + v.id
                });
              }
            } else if (v.ownerId) {
              // Concluded without winner
              await addDoc(collection(db, 'notifications'), {
                userId: v.ownerId,
                type: 'auction_ended',
                title: 'Auction Concluded',
                message: `Your auction for ${v.year} ${v.make} ${v.model} has concluded without winning bids. You can shift it to Sell Without Auction anytime!`,
                createdAt: now,
                read: false,
                link: 'vehicle_' + v.id
              });
            }
          } catch (err) {
            console.error("Error auto-concluding auction:", err);
          }
        }
      }
    };

    checkUpcomingTransitions();
    const interval = setInterval(checkUpcomingTransitions, 5000);
    return () => clearInterval(interval);
  }, [vehicles]);

  const handleConvertToDirectSale = async (vehicleId: string, directPrice: number) => {
    try {
      const now = Date.now();
      const threeMonthsLater = now + 90 * 24 * 60 * 60 * 1000;

      const vehicleRef = doc(db, 'vehicles', vehicleId);
      await updateDoc(vehicleRef, {
        listingType: 'direct',
        status: 'Direct Sale',
        directPrice: directPrice,
        startingPrice: directPrice,
        currentBid: directPrice,
        listedAt: now,
        expiresAt: threeMonthsLater,
        endTime: threeMonthsLater,
        isBlacklisted: false
      });

      setVehicles(prev => prev.map(v => v.id === vehicleId ? {
        ...v,
        listingType: 'direct',
        status: 'Direct Sale' as any,
        directPrice: directPrice,
        startingPrice: directPrice,
        currentBid: directPrice,
        listedAt: now,
        expiresAt: threeMonthsLater,
        endTime: threeMonthsLater,
        isBlacklisted: false
      } : v));

      if (selectedVehicle && selectedVehicle.id === vehicleId) {
        setSelectedVehicle(prev => prev ? {
          ...prev,
          listingType: 'direct',
          status: 'Direct Sale' as any,
          directPrice: directPrice,
          startingPrice: directPrice,
          currentBid: directPrice,
          listedAt: now,
          expiresAt: threeMonthsLater,
          endTime: threeMonthsLater,
          isBlacklisted: false
        } : null);
      }

      if (currentUser?.id) {
        await addDoc(collection(db, 'notifications'), {
          userId: currentUser.id,
          type: 'direct_sale_listed',
          title: 'Shifted to Direct Sale! 🏷️',
          message: `Your vehicle has been shifted to 'Vehicles For Sale' without auction at fixed price ₹${directPrice.toLocaleString()}. Active for 3 months!`,
          createdAt: now,
          read: false,
          link: 'vehicle_' + vehicleId
        });
      }

      alert(`Vehicle successfully shifted to 'Vehicles For Sale' without auction! It will be listed at ₹${directPrice.toLocaleString()} for 3 months.`);
    } catch (err: any) {
      console.error("Error shifting vehicle to direct sale:", err);
      alert("Error shifting vehicle: " + (err.message || 'Unknown error'));
    }
  };

  const handlePlaceUpcomingBid = async () => {
    if (!selectedVehicle) return;
    if (currentUser && !currentUser.isVerified && currentUser.role !== 'admin') {
      setShowVerificationModal(true);
      return;
    }
    if (selectedVehicle.ownerId && selectedVehicle.ownerId === currentUser.id) {
      alert("You cannot place pre-bids on your own vehicle listing.");
      return;
    }

    const askingPrice = selectedVehicle.startingPrice || selectedVehicle.currentBid;
    const prevUpcomingBids = selectedVehicle.upcomingBids || [];
    const prevLastBidder = prevUpcomingBids.length > 0 ? prevUpcomingBids[prevUpcomingBids.length - 1] : null;

    // Filter out previous entry from currentUser to append them as the NEW last bidder (priority holder)
    const newUpcomingBids = [
      ...prevUpcomingBids.filter(b => b.userId !== currentUser.id),
      {
        userId: currentUser.id,
        username: currentUser.username,
        amount: askingPrice,
        timestamp: Date.now()
      }
    ];

    try {
      await updateDoc(doc(db, 'vehicles', selectedVehicle.id), {
        upcomingBids: newUpcomingBids
      });

      setSelectedVehicle(prev => prev ? ({ ...prev, upcomingBids: newUpcomingBids }) : null);

      // Notify owner
      if (selectedVehicle.ownerId && selectedVehicle.ownerId !== currentUser.id) {
        await addDoc(collection(db, 'notifications'), {
          userId: selectedVehicle.ownerId,
          type: 'upcoming_bid',
          title: 'New Pre-Bid! 🎯',
          message: `@${currentUser.username} placed a pre-bid on your upcoming auction for ${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model} at asking price ₹${askingPrice.toLocaleString()}.`,
          createdAt: Date.now(),
          read: false,
          link: 'vehicle_' + selectedVehicle.id
        });
      }

      // Notify previous priority holder if they just got out-prioritized
      if (prevLastBidder && prevLastBidder.userId !== currentUser.id) {
        await addDoc(collection(db, 'notifications'), {
          userId: prevLastBidder.userId,
          type: 'priority_shifted',
          title: 'Priority Shifted ⚠️',
          message: `@${currentUser.username} placed an upcoming bid after you on ${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model} and gained the 1st Bidder Priority. Tap to re-stake!`,
          createdAt: Date.now(),
          read: false,
          link: 'vehicle_' + selectedVehicle.id
        });
      }

      alert(`Pre-bid registered at asking price of ₹${askingPrice.toLocaleString()}! You currently hold the 1st Bidder priority for when this auction goes live.`);
    } catch (e) {
      console.error("Error saving upcoming pre-bid:", e);
      alert("Failed to record pre-bid. Please try again.");
    }
  };

  const handlePlaceBid = async (amount: number) => {
    if (!selectedVehicle) return;

    if (currentUser && !currentUser.isVerified && currentUser.role !== 'admin') {
      setShowVerificationModal(true);
      return;
    }

    if (currentUser && selectedVehicle.ownerId && selectedVehicle.ownerId === currentUser.id) {
      alert("You cannot place bids on your own vehicle listing.");
      return;
    }

    if (amount <= selectedVehicle.currentBid) {
      alert(`Bid must be greater than current bid of ₹${selectedVehicle.currentBid.toLocaleString()}`);
      return;
    }

    try {
      const vehicleRef = doc(db, 'vehicles', selectedVehicle.id);
      const prevWinningUserId = selectedVehicle.winningUserId || selectedVehicle.winningBidderId;

      await updateDoc(vehicleRef, {
        currentBid: amount,
        userBidStatus: 'winning',
        winningUserId: currentUser.id,
        winningUsername: currentUser.username,
        winningBidderId: currentUser.id,
        liveParticipants: arrayUnion(currentUser.id),
        bidUserIds: arrayUnion(currentUser.id)
      });

      // Track placed bids persistently on Node.js backend for live Won / Lost tracking
      liveApi.recordUserBid(currentUser.id, selectedVehicle.id, amount)
        .then(updatedIds => {
          if (updatedIds && updatedIds.length) {
            setUserBidVehicleIds(updatedIds);
          }
        })
        .catch(err => console.warn('[App] Live bid record error:', err));

      setUserBidVehicleIds(prev => prev.includes(selectedVehicle.id) ? prev : [...prev, selectedVehicle.id]);

      // Record immutable bid in bids collection
      try {
        await addDoc(collection(db, 'bids'), {
          vehicleId: selectedVehicle.id,
          userId: currentUser.id,
          username: currentUser.username,
          amount: amount,
          timestamp: Date.now()
        });

        // Notify previous highest bidder that they have been outbid by a higher stake
        if (prevWinningUserId && prevWinningUserId !== currentUser.id) {
          await addDoc(collection(db, 'notifications'), {
            userId: prevWinningUserId,
            type: 'outbid',
            title: 'Outbid Alert! ⚠️',
            message: `@${currentUser.username} placed a higher stake of ₹${amount.toLocaleString()} on ${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}.`,
            createdAt: Date.now(),
            read: false,
            link: 'vehicle_' + selectedVehicle.id
          });
        }

        // Notify seller of new live bid
        if (selectedVehicle.ownerId && selectedVehicle.ownerId !== currentUser.id) {
          await addDoc(collection(db, 'notifications'), {
            userId: selectedVehicle.ownerId,
            type: 'new_bid',
            title: 'New Bid Placed! 📈',
            message: `@${currentUser.username} bid ₹${amount.toLocaleString()} on your ${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}.`,
            createdAt: Date.now(),
            read: false,
            link: 'vehicle_' + selectedVehicle.id
          });
        }
      } catch (e) {
        console.warn("Could not record bid or dispatch notification", e);
      }

      setSelectedVehicle({ 
        ...selectedVehicle, 
        currentBid: amount, 
        userBidStatus: 'winning',
        winningUserId: currentUser.id,
        winningUsername: currentUser.username,
        liveParticipants: Array.from(new Set([...(selectedVehicle.liveParticipants || []), currentUser.id])),
        bidUserIds: selectedVehicle.bidUserIds ? [...new Set([...selectedVehicle.bidUserIds, currentUser.id])] : [currentUser.id]
      });
      alert(`Bid of ₹${amount.toLocaleString()} placed successfully! Your participation in this live auction is confirmed.`);
    } catch (error) {
      console.error("Error placing bid: ", error);
      alert("Failed to place bid. Please try again.");
    }
  };

  const handleListVehicle = async (newVehicle: Vehicle) => {
      const activeUserId = auth.currentUser?.uid || currentUser.id;
      const activeUsername = currentUser.username || auth.currentUser?.displayName || 'user';
      const activeName = currentUser.fullName || currentUser.name || activeUsername;

      // Extract and remove static isOwner so it is never saved to Firestore
      const { isOwner: _ignored, ...cleanData } = newVehicle;
      const vehicleWithOwner = { 
        ...cleanData, 
        listingFee: 0,
        liveBidDuration: 0,
        boostOption: 'none',
        ownerId: activeUserId,
        ownerUsername: activeUsername,
        ownerName: activeName,
      };

      try {
        const vehicleId = newVehicle.id || Date.now().toString();
        const newVehicleRef = doc(collection(db, 'vehicles'), vehicleId);
        const vehicleWithId = { ...vehicleWithOwner, id: vehicleId } as any;
        
        // Remove undefined fields to prevent Firestore errors
        Object.keys(vehicleWithId).forEach(key => vehicleWithId[key] === undefined && delete vehicleWithId[key]);

        await setDoc(newVehicleRef, vehicleWithId);
        
        // Update local state immediately so user sees it right away across the app
        const localVehicleWithOwnership: Vehicle = {
          ...vehicleWithId,
          isOwner: true
        };
        setVehicles(prev => [localVehicleWithOwnership, ...prev.filter(v => v.id !== vehicleWithId.id)]);
      } catch (error: any) {
        console.error("Error listing vehicle: ", error);
        alert("Failed to list vehicle: " + (error?.message || "Please try again."));
        throw error;
      }
  };

  const handleUserSearch = (user: User) => {
      setProfileUser(user);
      setProfileTab('auctions'); // Reset tab to default when viewing a new user
      navigate('profile');
  };

  // Determine font class based on language
  const getFontClass = (lang: string) => {
    switch(lang) {
      case 'Hindi': return 'font-hindi';
      case 'Marathi': return 'font-marathi';
      case 'Sanskrit': return 'font-sanskrit';
      case 'Arabic': return 'font-arabic';
      case 'Urdu': return 'font-urdu';
      case 'Telugu': return 'font-telugu';
      case 'Malayalam': return 'font-malayalam';
      case 'Tamil': return 'font-tamil';
      case 'Gujarati': return 'font-gujarati';
      case 'Punjabi': return 'font-punjabi';
      case 'Odia': return 'font-odia';
      case 'Kannada': return 'font-kannada';
      case '日本語': return 'font-jp';
      default: return 'font-outfit';
    }
  };

  const isRTL = ['Arabic', 'Urdu'].includes(currentLanguage);

  // Filter Logic for Home View
  const filteredVehicles = vehicles.filter(v => {
    // Hide sold vehicles from main feed
    if (v.status === 'Sold' || (v.status as string) === 'Sold') return false; 
    // Hide blacklisted vehicles from active main feed
    if (v.isBlacklisted || v.status === 'Blacklisted' || (v.status as string) === 'Blacklisted') return false;

    const matchesSearch = 
      (v.make || '').toLowerCase().includes((searchQuery || '').toLowerCase()) || 
      (v.model || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      (v.vin || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      `${v.year} ${v.make} ${v.model}`.toLowerCase().includes((searchQuery || '').toLowerCase());
    
    if (!matchesSearch) return false;

    const now = Date.now();
    const isDirectSale = v.listingType === 'direct' || v.status === 'Direct Sale' || (v.status as any) === 'Direct Sale';
    const isUpcoming = !isDirectSale && ((v.startTime && v.startTime > now) || v.status === 'Upcoming');
    const isLive = !isDirectSale && !isUpcoming && (v.status === 'Live' || v.status === 'Live Auction' || v.endTime > now);

    if (auctionFilter === 'for_sale') {
      return isDirectSale;
    }
    if (auctionFilter === 'live') {
      return isLive;
    }
    if (auctionFilter === 'upcoming') {
      return isUpcoming;
    }
    
    // 'all' shows live auctions, upcoming auctions, and vehicles for sale
    return isLive || isUpcoming || isDirectSale;
  });

  const handleFollowToggle = async (targetUser: User) => {
    if (!currentUser?.id || !targetUser?.id) return;
    if (currentUser.id === targetUser.id) return;

    setIsFollowLoading(true);
    const isCurrentlyFollowing = (currentUser.followingIds || []).includes(targetUser.id);
    const targetFollowsMe = Boolean(
      (targetUser.followingIds || []).includes(currentUser.id) || 
      (currentUser.followersIds || []).includes(targetUser.id)
    );

    // Sync live with Node.js backend
    liveApi.toggleFollow(currentUser.id, targetUser.id).catch(err => {
      console.warn('[App] Live backend follow toggle warning:', err);
    });

    try {
      const currentUserRef = doc(db, 'users', currentUser.id);
      const targetUserRef = doc(db, 'users', targetUser.id);

      if (isCurrentlyFollowing) {
        // Unfollow
        await updateDoc(currentUserRef, {
          following: increment(-1),
          followingIds: arrayRemove(targetUser.id)
        });
        await updateDoc(targetUserRef, {
          followers: increment(-1),
          followersIds: arrayRemove(currentUser.id)
        });

        setCurrentUser(prev => ({
          ...prev,
          following: Math.max(0, (prev.following || 1) - 1),
          followingIds: (prev.followingIds || []).filter(id => id !== targetUser.id)
        }));
        setProfileUser(prev => prev.id === targetUser.id ? {
          ...prev,
          followers: Math.max(0, (prev.followers || 1) - 1),
          followersIds: (prev.followersIds || []).filter(id => id !== currentUser.id)
        } : prev);
      } else {
        // Follow or Follow Back
        await updateDoc(currentUserRef, {
          following: increment(1),
          followingIds: arrayUnion(targetUser.id)
        });
        await updateDoc(targetUserRef, {
          followers: increment(1),
          followersIds: arrayUnion(currentUser.id)
        });

        // Send follow or follow-back notification
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: targetUser.id,
            type: 'follower',
            title: targetFollowsMe ? 'Followed you back! 🤝' : 'New Follower! 👤',
            message: targetFollowsMe 
              ? `@${currentUser.username} followed you back.` 
              : `@${currentUser.username} started following you.`,
            createdAt: Date.now(),
            read: false,
            link: 'profile'
          });
        } catch (e) {
          console.warn("Could not dispatch follow notification", e);
        }

        setCurrentUser(prev => ({
          ...prev,
          following: (prev.following || 0) + 1,
          followingIds: [...(prev.followingIds || []), targetUser.id]
        }));
        setProfileUser(prev => prev.id === targetUser.id ? {
          ...prev,
          followers: (prev.followers || 0) + 1,
          followersIds: [...(prev.followersIds || []), currentUser.id]
        } : prev);
      }
    } catch (err: any) {
      console.error("Error toggling follow:", err);
      alert("Failed to update follow status: " + err.message);
    } finally {
      setIsFollowLoading(false);
    }
  };

  // Helper to determine vehicle auction bidding info & participants
  const getVehicleBiddingMeta = (v: Vehicle) => {
    // Collect all bids for this vehicle from the real-time bids collection
    const vehicleBids = allBids
      .filter(b => b.vehicleId === v.id)
      .sort((a, b) => (b.amount || 0) - (a.amount || 0));

    const highestBidFromCol = vehicleBids[0];

    // Participating user IDs who placed at least one bid on this vehicle
    const participantIds = new Set<string>([
      ...(v.bidUserIds || []),
      ...vehicleBids.map(b => (b.userId || b.bidderId) as string).filter(Boolean)
    ]);

    // Highest bidder ID & username (the user who holds the highest stake / won the bid)
    const winningUserId = v.winningUserId || highestBidFromCol?.userId || highestBidFromCol?.bidderId || null;
    const winningUsername = v.winningUsername || highestBidFromCol?.username || highestBidFromCol?.bidderUsername || 'Leading Bidder';
    const winningAmount = Math.max(v.currentBid || 0, highestBidFromCol?.amount || 0);

    return {
      participantIds: Array.from(participantIds),
      participantCount: participantIds.size,
      winningUserId,
      winningUsername,
      winningAmount,
      vehicleBids
    };
  };

  // Profile Data Filtering
  const isViewingSelf = Boolean(currentUser && profileUser && profileUser.id === currentUser.id);
  const targetUserId = profileUser?.id || currentUser?.id || '';
  const nowTime = Date.now();
  
  const profileListings = vehicles.filter(v => 
    (targetUserId && v.ownerId && v.ownerId === targetUserId) || 
    (Boolean(v.ownerUsername && (profileUser?.username || currentUser?.username) && v.ownerUsername.toLowerCase() === (profileUser?.username || currentUser?.username)?.toLowerCase()))
  );
  const profileAuctionVehicles = profileListings.filter(v => v.listingType !== 'direct' && v.status !== 'Direct Sale' && (v.status as any) !== 'Direct Sale');
  const profileDirectVehicles = profileListings.filter(v => v.listingType === 'direct' || v.status === 'Direct Sale' || (v.status as any) === 'Direct Sale');
  const profileWatchlist = isViewingSelf ? vehicles.filter(v => v.isWatchlisted) : [];
  
  // Won: vehicle auction bid won by the user (they placed the highest stake / won the auction)
  const profileWon = vehicles.filter(v => {
    const isClosed = v.status === 'Sold' || (v.status as string) === 'Ended' || v.endTime <= nowTime;
    const meta = getVehicleBiddingMeta(v);
    const isWinner = meta.winningUserId === targetUserId || (isViewingSelf && v.userBidStatus === 'won') || v.winningBidderId === targetUserId;
    const hasParticipated = meta.participantIds.includes(targetUserId) || (isViewingSelf && userBidVehicleIds.includes(v.id)) || isWinner;
    return isClosed && isWinner && hasParticipated;
  });

  // Lost: user participated in the live auction by placing a bid, but another user won.
  // Note: Users who ONLY placed an upcoming pre-bid and did NOT participate in the live auction are NOT considered as lost.
  const profileLost = vehicles.filter(v => {
    const isClosed = v.status === 'Sold' || (v.status as string) === 'Ended' || v.endTime <= nowTime;
    if (!isClosed) return false;

    const meta = getVehicleBiddingMeta(v);
    
    // Check active live participation:
    const inLiveParticipants = (v.liveParticipants || []).includes(targetUserId);
    const hasLiveBidRecord = allBids.some(b => b.vehicleId === v.id && (b.userId === targetUserId || b.bidderId === targetUserId));
    const wasLiveFirstBidder = v.firstBidderId === targetUserId;
    const hasActiveLiveParticipation = inLiveParticipants || hasLiveBidRecord || wasLiveFirstBidder || (isViewingSelf && userBidVehicleIds.includes(v.id));

    if (!hasActiveLiveParticipation) {
      return false; // Did not participate in the live auction; not considered lost
    }

    const isWinner = meta.winningUserId === targetUserId || (isViewingSelf && v.userBidStatus === 'won') || v.winningBidderId === targetUserId;
    return !isWinner;
  });

  // Archive filtering (Past concluded auctions: user listings that ended/sold, or past bids where auction concluded)
  const archivedVehicles = vehicles.filter(v => {
    const isClosed = v.status === 'Sold' || (v.status as string) === 'Ended' || v.endTime <= nowTime;
    if (!isClosed) return false;

    const meta = getVehicleBiddingMeta(v);
    const isOwner = Boolean(currentUser?.id && v.ownerId === currentUser.id);
    const hasBid = meta.participantIds.includes(currentUser.id) || userBidVehicleIds.includes(v.id);

    if (archiveFilter === 'listings') return isOwner;
    if (archiveFilter === 'bids') return hasBid;
    return isOwner || hasBid;
  });

  // Determine which tab to show vehicles for
  let activeProfileVehicles: Vehicle[] = [];
  if (profileTab === 'auctions') {
    if (profileListedFilter === 'auction') activeProfileVehicles = profileAuctionVehicles;
    else if (profileListedFilter === 'direct') activeProfileVehicles = profileDirectVehicles;
    else activeProfileVehicles = profileListings;
  }
  else if (profileTab === 'watchlist') activeProfileVehicles = profileWatchlist;
  else if (profileTab === 'won') activeProfileVehicles = profileWon;
  else if (profileTab === 'lost') activeProfileVehicles = profileLost;


  // Force Authentication
  if (!isAuthenticated) {
      return (
          <div className={`min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 ${getFontClass(currentLanguage)}`} dir={isRTL ? 'rtl' : 'ltr'}>
              <Auth initialMode="login" onLoginSuccess={handleLoginSuccess} t={t} />
          </div>
      );
  }

  return (
    <div className={`min-h-screen font-sans text-gray-900 pb-28 md:pb-32 bg-transparent selection:bg-red-200 selection:text-red-900 ${getFontClass(currentLanguage)}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <Navbar 
        onNavigate={navigate} 
        activePage={currentView} 
        currentUser={currentUser} 
        currentLanguage={currentLanguage}
        onOpenVerification={() => setShowVerificationModal(true)}
      />

      <main>
        {notifications.length > 0 && (
          <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
            {notifications.map(notif => (
              <div key={notif.id} className="bg-white border-l-4 border-green-500 shadow-xl rounded-lg p-4 animate-fade-in-right flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm mb-1">Update</h4>
                  <p className="text-gray-600 text-xs leading-relaxed">{notif.message}</p>
                </div>
                <button 
                  onClick={() => updateDoc(doc(db, 'notifications', notif.id), { read: true })}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
        {currentView === 'home' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-5 pb-24">
            <div className="glass-panel p-1.5 rounded-xl mb-4 flex flex-col md:flex-row gap-1.5 items-center justify-between border border-gray-200/80 shadow-xs">
              <div className="flex-1 w-full md:w-auto p-0.5">
                <input 
                  type="text" 
                  placeholder={t.searchPlaceholder}
                  className="w-full bg-white/70 border border-gray-200/80 rounded-lg px-3.5 py-1.5 focus:ring-2 focus:ring-red-200 focus:bg-white transition-all outline-none text-xs sm:text-sm text-gray-700 placeholder:text-gray-400"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex gap-1.5 w-full md:w-auto overflow-x-auto p-0.5 scrollbar-hide">
                <button 
                  onClick={() => setAuctionFilter('all')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs whitespace-nowrap ${auctionFilter === 'all' ? 'bg-gray-900 text-white' : 'bg-white/70 text-gray-600 hover:bg-white hover:text-gray-900 border border-gray-200/60'}`}
                >
                  {t.allAuctions}
                </button>
                <button 
                  onClick={() => setAuctionFilter('live')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs whitespace-nowrap ${auctionFilter === 'live' ? 'bg-red-600 text-white' : 'bg-white/70 text-gray-600 hover:bg-white hover:text-red-500 border border-gray-200/60'}`}
                >
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${auctionFilter === 'live' ? 'bg-white animate-pulse' : 'bg-red-500'}`}></span>
                  {t.liveAuctions}
                </button>
                <button 
                  onClick={() => setAuctionFilter('upcoming')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs whitespace-nowrap ${auctionFilter === 'upcoming' ? 'bg-blue-600 text-white' : 'bg-white/70 text-gray-600 hover:bg-white hover:text-blue-500 border border-gray-200/60'}`}
                >
                  {t.upcoming}
                </button>
                <button 
                  onClick={() => setAuctionFilter('for_sale')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs whitespace-nowrap flex items-center gap-1 ${auctionFilter === 'for_sale' ? 'bg-emerald-600 text-white' : 'bg-white/70 text-gray-600 hover:bg-white hover:text-emerald-600 border border-gray-200/60'}`}
                >
                  <span>🏷️</span>
                  <span>Vehicles For Sale</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mb-3.5 px-1">
               <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight flex items-center">
                   {auctionFilter === 'all' && t.homeTitle}
                   {auctionFilter === 'live' && t.liveAuctions}
                   {auctionFilter === 'upcoming' && t.upcoming}
                   {auctionFilter === 'for_sale' && 'Vehicles For Sale (Sell Without Auction)'}
                   <span className="text-gray-500 font-medium text-xs ml-2 bg-gray-100/80 px-2 py-0.5 rounded-md">{!isLoading && `${filteredVehicles.length} Vehicles`}</span>
               </h2>
               <div className="hidden sm:block text-xs text-gray-600 bg-white/70 backdrop-blur-md px-3 py-1 rounded-md border border-gray-200/80">Sort by: <span className="font-semibold text-gray-900 cursor-pointer">Ending Soonest ▼</span></div>
            </div>

            {isLoading ? (
               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
                 {[...Array(12)].map((_, i) => <VehicleCardSkeleton key={i} />)}
               </div>
            ) : filteredVehicles.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
                {filteredVehicles.map(vehicle => (
                  <VehicleCard 
                    key={vehicle.id} 
                    vehicle={vehicle} 
                    onClick={handleVehicleClick} 
                    currentUser={currentUser}
                    t={t}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 px-4 glass-panel rounded-3xl border border-gray-200/70 max-w-xl mx-auto shadow-sm">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-red-50 to-orange-50 border border-red-100 flex items-center justify-center text-red-600 shadow-inner">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 tracking-tight">No vehicles listed yet</h3>
                <p className="text-gray-500 mt-2 text-sm max-w-md mx-auto leading-relaxed">
                  {auctionFilter === 'live' 
                    ? "There are currently no live auctions running. Check back soon or list your vehicle to start an auction!" 
                    : auctionFilter === 'for_sale' 
                    ? "No vehicles listed for direct sale yet. You can list one with instant buy options!"
                    : "No vehicles currently listed. Be the first to list your vehicle for live auction or direct sale!"}
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => {
                      if (!currentUser) {
                        setCurrentView('auth');
                      } else {
                        setCurrentView('sell');
                      }
                    }}
                    className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-semibold text-sm rounded-xl shadow-md shadow-red-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    List Your Vehicle
                  </button>
                  {auctionFilter !== 'all' && (
                    <button
                      onClick={() => setAuctionFilter('all')}
                      className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl transition-colors"
                    >
                      View All Listings
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'detail' && (
           isLoading ? (
             <VehicleDetailSkeleton />
           ) : (
             selectedVehicle && (
                <VehicleDetail 
                  vehicle={selectedVehicle} 
                  onBack={handleBackToHome}
                  onPlaceBid={handlePlaceBid}
                  onPlaceUpcomingBid={handlePlaceUpcomingBid}
                  onMarkSold={handleMarkSold}
                  onConvertToDirectSale={handleConvertToDirectSale}
                  currentUser={currentUser}
                  t={t}
                  onViewProfile={(u) => {
                    setProfileUser(u);
                    setProfileTab('auctions');
                    setCurrentView('profile');
                  }}
                  onFollowToggle={handleFollowToggle}
                  allUsers={allUsers}
                  isFollowLoading={isFollowLoading}
                />
             )
           )
        )}

        {currentView === 'sell' && (
            <SellCar currentUser={currentUser} onNavigate={navigate} onListVehicle={handleListVehicle} />
        )}

        {currentView === 'search' && (
            <SearchUsers 
                onSearchUser={handleUserSearch} 
                t={t} 
                vehicles={vehicles}
                onSelectVehicle={handleVehicleClick}
                currentUser={currentUser}
                onFollowToggle={handleFollowToggle}
                isFollowLoading={isFollowLoading}
                onNavigate={navigate}
            />
        )}

        {currentView === 'settings' && (
            <Settings 
                key={`settings-${settingsSection || 'MENU'}`}
                onNavigate={(view) => {
                    navigate(view);
                }} 
                onLogout={handleLogout} 
                currentUser={currentUser} 
                currentLanguage={currentLanguage}
                setLanguage={setCurrentLanguage}
                t={t}
                initialSection={settingsSection || 'MENU'}
            />
        )}

        {currentView === 'profile' && (
          isLoading ? (
            <div className="max-w-3xl mx-auto px-4 py-8 animate-pulse">
               <div className="flex gap-8 items-center mb-8">
                   <div className="w-32 h-32 rounded-full bg-gray-200"></div>
                   <div className="flex-1 space-y-4">
                       <div className="h-8 w-48 bg-gray-200 rounded"></div>
                       <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
                   </div>
               </div>
               <div className="grid grid-cols-3 gap-1">
                   {[1,2,3,4,5,6].map(i => <div key={i} className="aspect-square bg-gray-200"></div>)}
               </div>
            </div>
          ) : (
              <div className="max-w-xl mx-auto px-3 pt-2 pb-24">
                {(() => {
                  const profileUserFollowsMe = Boolean(
                    (profileUser.followingIds || []).includes(currentUser.id) ||
                    (currentUser.followersIds || []).includes(profileUser.id)
                  );
                  const isFollowingProfileUser = Boolean((currentUser.followingIds || []).includes(profileUser.id));

                  return (
                    <>
                      {/* Username Header (Mobile style) */}
                      <div className="flex items-center justify-center gap-1.5 mb-4 relative">
                          <span className="text-sm font-bold text-gray-900">@{profileUser.username}</span>
                          {profileUser.isVerified && (
                             <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                          )}
                          {!isViewingSelf && profileUserFollowsMe && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                              Follows you
                            </span>
                          )}
                      </div>

                      <div className="flex items-center justify-between mb-3">
                           {/* Avatar Column */}
                          <div className="relative">
                              <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full p-[2px] bg-gradient-to-tr from-gray-200 to-white shadow-xs">
                                  <img 
                                      src={profileUser.avatarUrl} 
                                      alt={profileUser.username}
                                      className="w-full h-full rounded-full object-cover border-2 border-white"
                                  />
                              </div>
                          </div>

                          {/* Stats Row */}
                          <div className="flex-1 flex justify-around ml-2 sm:ml-4">
                             <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition" onClick={() => { setProfileTab('auctions'); setProfileListedFilter('all'); }}>
                                 <span className="font-extrabold text-sm sm:text-base text-gray-900">{profileListings.length}</span>
                                 <span className="text-[10px] sm:text-[11px] text-gray-500 font-medium">vehicle listed</span>
                             </div>
                             <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition" onClick={() => setProfileTab('won')}>
                                 <span className="font-extrabold text-sm sm:text-base text-emerald-600">{profileWon.length}</span>
                                 <span className="text-[10px] sm:text-[11px] text-emerald-700 font-bold">won</span>
                             </div>
                             <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition" onClick={() => setProfileTab('lost')}>
                                 <span className="font-extrabold text-sm sm:text-base text-rose-600">{profileLost.length}</span>
                                 <span className="text-[10px] sm:text-[11px] text-rose-700 font-bold">lost</span>
                             </div>
                             <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition" onClick={() => setShowFollowModal('followers')}>
                                 <span className="font-extrabold text-sm sm:text-base text-gray-900">{profileUser.followers || 0}</span>
                                 <span className="text-[10px] sm:text-[11px] text-gray-500 font-medium">followers</span>
                             </div>
                             <div className="flex flex-col items-center cursor-pointer hover:opacity-80 transition" onClick={() => setShowFollowModal('following')}>
                                 <span className="font-extrabold text-sm sm:text-base text-gray-900">{profileUser.following || 0}</span>
                                 <span className="text-[10px] sm:text-[11px] text-gray-500 font-medium">following</span>
                             </div>
                          </div>
                      </div>

                      {/* Bio Section */}
                      <div className="mb-4 px-1">
                          <h1 className="font-bold text-gray-900 text-xs sm:text-sm mb-0.5">{profileUser.fullName}</h1>
                          <div className="text-xs text-gray-700 whitespace-pre-line leading-relaxed">
                             {profileUser.bio}
                          </div>
                          {profileUser.website && (
                              <a href={profileUser.website} target="_blank" rel="noopener noreferrer" className="block mt-1 text-xs text-blue-600 font-medium hover:underline flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                  {profileUser.website.replace(/^https?:\/\//, '')}
                              </a>
                          )}
                      </div>

                      {/* ID Verification Status Banner for Self Profile */}
                      {isViewingSelf && !currentUser.isVerified && (
                        <div className="mb-3 p-2.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl flex items-center justify-between gap-2.5 shadow-xs animate-fade-in">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-sm shrink-0">
                              🛡️
                            </div>
                            <div className="text-left">
                              <div className="text-xs font-bold text-amber-900">
                                {currentUser.verificationStatus === 'pending' ? 'ID Verification Under Review' : 'ID Verification Required'}
                              </div>
                              <div className="text-[10px] text-amber-700">
                                {currentUser.verificationStatus === 'pending' 
                                  ? 'Review in progress.' 
                                  : 'Verify your ID to bid and list.'}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setShowVerificationModal(true)}
                            className="px-2.5 py-1 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-bold text-[11px] rounded-lg shadow-xs shrink-0 transition"
                          >
                            {currentUser.verificationStatus === 'pending' ? 'Status' : 'Verify'}
                          </button>
                        </div>
                      )}

                      {/* Profile Action Buttons */}
                      <div className="flex gap-1.5 mb-4">
                           {isViewingSelf ? (
                              <>
                                  <button onClick={() => { setSettingsSection('EDIT_PROFILE'); setCurrentView('settings'); }} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-1.5 rounded-lg text-xs transition-colors border border-gray-200 shadow-xs flex items-center justify-center gap-1">
                                      <span>✏️</span>
                                      <span>Edit Profile</span>
                                  </button>
                                  <button onClick={() => setShowArchiveModal(true)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-1.5 rounded-lg text-xs transition-colors border border-gray-200 shadow-xs flex items-center justify-center gap-1">
                                      <span>📦</span>
                                      <span>Archive</span>
                                  </button>
                                  <button 
                                      onClick={() => setShowDiscoverDrawer(true)} 
                                      className="flex-1 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 font-semibold py-1.5 rounded-lg text-xs transition-colors border border-blue-200 shadow-xs flex items-center justify-center gap-1"
                                      title="Discover people to follow and follow back"
                                  >
                                      <span>👥</span>
                                      <span>Find People</span>
                                  </button>
                              </>
                           ) : (
                              <>
                                  <button 
                                      onClick={() => handleFollowToggle(profileUser)}
                                      disabled={isFollowLoading}
                                      className={`flex-1 font-bold py-1.5 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-1 shadow-xs ${
                                        isFollowingProfileUser
                                          ? 'bg-gray-100 hover:bg-red-50 text-gray-800 hover:text-red-600 border border-gray-200 group'
                                          : profileUserFollowsMe
                                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-200 ring-2 ring-blue-400/20'
                                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                                      }`}
                                  >
                                      {isFollowingProfileUser ? (
                                        <>
                                          <svg className="w-3.5 h-3.5 text-emerald-600 group-hover:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                          <span className="group-hover:hidden">Following</span>
                                          <span className="hidden group-hover:inline text-red-600">Unfollow</span>
                                        </>
                                      ) : profileUserFollowsMe ? (
                                        <>
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                                          <span>Follow Back</span>
                                        </>
                                      ) : (
                                        <>
                                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
                                          <span>Follow</span>
                                        </>
                                      )}
                                  </button>
                                  <button onClick={() => setCurrentView('support')} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-1.5 rounded-lg text-xs transition-colors border border-gray-200 shadow-xs">
                                      Message
                                  </button>
                                  <button 
                                    onClick={() => {
                                      navigator.clipboard.writeText(window.location.origin + '?u=' + profileUser.username);
                                      alert(`Profile link for @${profileUser.username} copied to clipboard!`);
                                    }}
                                    title="Share Profile"
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-2.5 rounded-lg border border-gray-200 transition-colors flex items-center justify-center shadow-xs"
                                  >
                                      <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
                                  </button>
                              </>
                           )}
                      </div>

                      {/* Suggested People to Follow (Self Profile Quick Follow Strip) */}
                      {isViewingSelf && allUsers.filter(u => u.id !== currentUser.id).length > 0 && (
                        <div className="mb-4 bg-gray-50/80 p-3 rounded-2xl border border-gray-200/80">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                              <span>✨</span>
                              <span>Suggested People to Follow</span>
                            </span>
                            <button
                              onClick={() => setShowDiscoverDrawer(true)}
                              className="text-[10px] text-blue-600 font-bold hover:underline"
                            >
                              See all ({allUsers.filter(u => u.id !== currentUser.id).length})
                            </button>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                            {allUsers
                              .filter(u => u.id !== currentUser.id)
                              .slice(0, 5)
                              .map(u => {
                                const isFollowing = (currentUser.followingIds || []).includes(u.id);
                                const uFollowsMe = (u.followingIds || []).includes(currentUser.id) || (currentUser.followersIds || []).includes(u.id);

                                return (
                                  <div 
                                    key={u.id}
                                    className="bg-white p-2.5 rounded-xl border border-gray-100 flex flex-col items-center min-w-[120px] max-w-[130px] shrink-0 text-center shadow-xs"
                                  >
                                    <div 
                                      onClick={() => { setProfileUser(u); setProfileTab('auctions'); }}
                                      className="cursor-pointer"
                                    >
                                      <img 
                                        src={u.avatarUrl || `https://i.pravatar.cc/150?u=${u.id}`} 
                                        alt={u.username}
                                        className="w-10 h-10 rounded-full object-cover border border-gray-200 mx-auto mb-1.5"
                                      />
                                      <p className="font-bold text-gray-900 text-[11px] truncate w-24">@{u.username}</p>
                                      {uFollowsMe && (
                                        <span className="text-[8px] bg-blue-50 text-blue-700 font-semibold px-1 py-0.2 rounded block truncate mb-1">
                                          Follows you
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleFollowToggle(u)}
                                      disabled={isFollowLoading}
                                      className={`w-full mt-1.5 text-[10px] font-bold py-1 px-1.5 rounded-lg transition-all shadow-xs ${
                                        isFollowing
                                          ? 'bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 border border-gray-200'
                                          : uFollowsMe
                                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                                      }`}
                                    >
                                      {isFollowing ? 'Following' : uFollowsMe ? 'Follow Back' : 'Follow'}
                                    </button>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Tabs - Instagram Style */}
                <div className="border-t border-gray-200">
                    <div className="flex justify-center gap-3 sm:gap-6 overflow-x-auto">
                         <button 
                            onClick={() => setProfileTab('auctions')}
                            className={`flex items-center gap-1.5 py-2 border-t border-transparent -mt-px text-[11px] font-semibold tracking-wider uppercase transition-all ${profileTab === 'auctions' ? 'border-gray-900 text-gray-900 font-bold' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            <span>Vehicle Listed</span>
                            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-gray-100 text-gray-800 font-bold">
                                {profileListings.length}
                            </span>
                        </button>
                        {isViewingSelf && (
                            <button 
                                onClick={() => setProfileTab('watchlist')}
                                className={`flex items-center gap-1 py-2 border-t border-transparent -mt-px text-[11px] font-semibold tracking-wider uppercase transition-all ${profileTab === 'watchlist' ? 'border-gray-900 text-gray-900 font-bold' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                 <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                                <span className="hidden sm:inline">Saved</span>
                            </button>
                        )}
                        {isViewingSelf && (
                            <button 
                                onClick={() => setProfileTab('dashboard')}
                                className={`flex items-center gap-1 py-2 border-t border-transparent -mt-px text-[11px] font-semibold tracking-wider uppercase transition-all ${profileTab === 'dashboard' ? 'border-gray-900 text-gray-900 font-bold' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="hidden sm:inline">Dashboard</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Sub-selector when Vehicle Listed tab is active */}
                {profileTab === 'auctions' && (
                  <div className="flex items-center justify-center gap-1.5 py-2.5 overflow-x-auto scrollbar-hide border-b border-gray-100 mb-2">
                    <button
                      type="button"
                      onClick={() => setProfileListedFilter('all')}
                      className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold transition flex items-center gap-1.5 shrink-0 ${
                        profileListedFilter === 'all' 
                          ? 'bg-gray-900 text-white shadow-xs' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>Total Vehicles Listed:</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[9.5px] ${profileListedFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-800'}`}>
                        {profileListings.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileListedFilter('auction')}
                      className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold transition flex items-center gap-1.5 shrink-0 ${
                        profileListedFilter === 'auction' 
                          ? 'bg-red-600 text-white shadow-xs' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>🔨 Auction:</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[9.5px] ${profileListedFilter === 'auction' ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'}`}>
                        {profileAuctionVehicles.length}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileListedFilter('direct')}
                      className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold transition flex items-center gap-1.5 shrink-0 ${
                        profileListedFilter === 'direct' 
                          ? 'bg-emerald-600 text-white shadow-xs' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>🏷️ Without Auction:</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[9.5px] ${profileListedFilter === 'direct' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                        {profileDirectVehicles.length}
                      </span>
                    </button>
                  </div>
                )}

                {/* Image Grid */}
                {profileTab === 'dashboard' ? (
                     <DashboardView 
                        userVehicles={profileListings} 
                        currentUser={currentUser}
                        onNavigate={navigate}
                        onSelectVehicle={handleVehicleClick}
                     />
                ) : (
                    <div>
                        {/* Context Banners for Won and Lost Tabs */}
                        {profileTab === 'won' && (
                            <div className="mb-2 mt-1.5 bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-sm font-black shadow-xs">
                                        🏆
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-emerald-950">Auctions Won</h4>
                                        <p className="text-[10px] text-emerald-700">Vehicles won with the highest stake in the auction.</p>
                                    </div>
                                </div>
                                <span className="text-[11px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-md shadow-xs">
                                    {profileWon.length} Won
                                </span>
                            </div>
                        )}

                        {profileTab === 'lost' && (
                            <div className="mb-2 mt-1.5 bg-rose-50 border border-rose-200 rounded-xl p-2.5 flex items-center justify-between shadow-xs">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 bg-rose-600 text-white rounded-lg flex items-center justify-center text-sm font-black shadow-xs">
                                        ✕
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-rose-950">Auctions Lost</h4>
                                        <p className="text-[10px] text-rose-700">Auctions where another user won with a higher stake.</p>
                                    </div>
                                </div>
                                <span className="text-[11px] font-bold bg-rose-600 text-white px-2 py-0.5 rounded-md shadow-xs">
                                    {profileLost.length} Lost
                                </span>
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-1 md:gap-4 mt-1">
                          {activeProfileVehicles.map(vehicle => {
                             const meta = getVehicleBiddingMeta(vehicle);
                             const isClosed = vehicle.status === 'Sold' || (vehicle.status as string) === 'Ended' || vehicle.endTime <= nowTime;

                             return (
                              <div 
                                 key={vehicle.id} 
                                 onClick={() => handleVehicleClick(vehicle)}
                                 className="relative aspect-square group cursor-pointer overflow-hidden bg-gray-200 rounded-lg"
                             >
                                 <img 
                                     src={vehicle.images?.[vehicle.coverImageIndex || 0] || `https://picsum.photos/id/${vehicle.imageSeed}/1200/1200`} 
                                     alt={vehicle.model}
                                     className="w-full h-full object-cover"
                                 />
                                 <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white font-bold text-sm p-2 text-center">
                                     <div className="flex items-center gap-3">
                                          <div className="flex items-center gap-1">
                                             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                                             <span>{vehicle.views || 0}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                             <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                                             <span>{vehicle.interestedCount || vehicle.watchCount || 0}</span>
                                          </div>
                                     </div>
                                     <div className="flex flex-col items-center mt-1 text-xs font-normal">
                                          <span className="uppercase text-gray-300 text-[10px]">
                                             {profileTab === 'won' ? (isClosed ? 'Winning Stake' : 'Highest Stake') : profileTab === 'lost' ? 'Winning Stake' : 'Current Bid'}
                                          </span>
                                          <span className="font-black text-sm sm:text-base text-white">₹{(vehicle.currentBid || 0).toLocaleString()}</span>
                                          {profileTab === 'lost' && (
                                             <span className="text-[10px] text-rose-300 mt-0.5 line-clamp-1">
                                               Won by @{meta.winningUsername || vehicle.winningUsername}
                                             </span>
                                          )}
                                          {(profileTab === 'lost' || profileTab === 'won') && meta.participantCount > 0 && (
                                             <span className="text-[9px] text-gray-300 mt-0.5 bg-black/40 px-1.5 py-0.5 rounded-full">
                                               👥 {meta.participantCount} bidders participated
                                             </span>
                                          )}
                                     </div>
                                 </div>

                                 {/* Status Badges */}
                                 {profileTab === 'won' && (
                                     <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow flex items-center gap-1">
                                         <span>🏆</span> {isClosed ? 'Won' : 'Leading'}
                                     </div>
                                 )}
                                 {profileTab === 'lost' && (
                                     <div className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow flex items-center gap-1">
                                         <span>✕</span> Outbid
                                     </div>
                                 )}
                                 {profileTab !== 'won' && profileTab !== 'lost' && vehicle.status === 'Live Auction' && (
                                     <div className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border border-white animate-pulse"></div>
                                 )}
                                 {profileTab !== 'won' && profileTab !== 'lost' && vehicle.status === 'Pending Review' && (
                                     <div className="absolute top-2 left-2 bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">Pending</div>
                                 )}
                              </div>
                             );
                          })}
                          {activeProfileVehicles.length === 0 && (
                              <div className="col-span-3 py-16 text-center text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 p-6">
                                  {profileTab === 'won' ? (
                                      <div>
                                          <div className="text-3xl mb-2">🏆</div>
                                          <h5 className="font-bold text-gray-800 text-base mb-1">No Won Auctions Yet</h5>
                                          <p className="text-xs text-gray-500 max-w-sm mx-auto">When an auction you placed bids on ends or you hold the highest stake, it will be listed here as a won vehicle.</p>
                                      </div>
                                  ) : profileTab === 'lost' ? (
                                      <div>
                                          <div className="text-3xl mb-2">⏱️</div>
                                          <h5 className="font-bold text-gray-800 text-base mb-1">No Lost Auctions</h5>
                                          <p className="text-xs text-gray-500 max-w-sm mx-auto">Auctions you placed bids on where another participant placed a higher stake will be displayed here.</p>
                                      </div>
                                  ) : profileTab === 'watchlist' ? (
                                      "No saved vehicles yet."
                                  ) : isViewingSelf ? (
                                      "No vehicles found in this section."
                                  ) : (
                                      "This user has no active auctions."
                                  )}
                              </div>
                          )}
                        </div>
                    </div>
                )}
            </div>
          )
        )}

      {/* Auction & Activity Archive Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-amber-50/50 to-orange-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-200/50 flex items-center justify-center text-xl shadow-sm">
                  📦
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base flex items-center gap-1.5">
                    Auction & Activity Archive
                  </h3>
                  <p className="text-[11px] text-gray-500">Your historical record of completed auctions, finalized sales & past bids</p>
                </div>
              </div>
              <button 
                onClick={() => setShowArchiveModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Filter Chips */}
            <div className="p-3 bg-gray-50 border-b border-gray-100 flex gap-2 overflow-x-auto">
              <button
                onClick={() => setArchiveFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  archiveFilter === 'all' ? 'bg-gray-900 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                All Archived ({archivedVehicles.length})
              </button>
              <button
                onClick={() => setArchiveFilter('listings')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  archiveFilter === 'listings' ? 'bg-gray-900 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Closed Listings
              </button>
              <button
                onClick={() => setArchiveFilter('bids')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  archiveFilter === 'bids' ? 'bg-gray-900 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                Concluded Bids
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {archivedVehicles.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center text-2xl">
                    📦
                  </div>
                  <h4 className="font-bold text-gray-700 text-sm mb-1">Archive is Currently Empty</h4>
                  <p className="text-xs text-gray-400 max-w-xs mx-auto">
                    When vehicle auctions you created or bid on conclude, their complete final record and bidding history will appear here.
                  </p>
                </div>
              ) : (
                archivedVehicles.map(vehicle => {
                  const meta = getVehicleBiddingMeta(vehicle);
                  const isUserWinner = meta.winningUserId === currentUser.id || vehicle.userBidStatus === 'won';
                  const isUserOwner = Boolean(currentUser && vehicle.ownerId === currentUser.id);

                  return (
                    <div 
                      key={vehicle.id}
                      onClick={() => {
                        handleVehicleClick(vehicle);
                        setShowArchiveModal(false);
                      }}
                      className="p-3 bg-white border border-gray-100 hover:border-gray-300 rounded-2xl transition shadow-sm hover:shadow-md cursor-pointer flex items-center gap-3.5"
                    >
                      <img 
                        src={vehicle.images?.[vehicle.coverImageIndex || 0] || `https://picsum.photos/id/${vehicle.imageSeed}/600/600`} 
                        alt={vehicle.model}
                        className="w-16 h-16 rounded-xl object-cover bg-gray-100 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <h4 className="font-bold text-gray-900 text-sm truncate">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                          <span className="font-semibold text-gray-800">
                            Final: ₹{(vehicle.currentBid || 0).toLocaleString()}
                          </span>
                          <span>•</span>
                          <span>👥 {meta.participantCount} bidders</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isUserOwner && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              Your Listing ({vehicle.status || 'Closed'})
                            </span>
                          )}
                          {!isUserOwner && isUserWinner && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <span>🏆</span> Won Auction
                            </span>
                          )}
                          {!isUserOwner && !isUserWinner && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                              <span>✕</span> Outbid by @{meta.winningUsername}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-gray-400 text-sm font-bold shrink-0">→</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 border-t border-gray-100 bg-gray-50/80 flex justify-end">
              <button
                onClick={() => setShowArchiveModal(false)}
                className="px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl transition"
              >
                Close Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Social Followers / Following Modal */}
      {showFollowModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-base capitalize">
                  {showFollowModal === 'followers' ? 'Followers' : 'Following'}
                </h3>
                <p className="text-[11px] text-gray-400">@{profileUser.username}</p>
              </div>
              <button 
                onClick={() => setShowFollowModal(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* User List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(() => {
                const userList = allUsers.filter(u => {
                  if (showFollowModal === 'followers') {
                    return (profileUser.followersIds || []).includes(u.id) || (u.followingIds || []).includes(profileUser.id);
                  } else {
                    return (profileUser.followingIds || []).includes(u.id);
                  }
                });

                if (userList.length === 0) {
                  return (
                    <div className="py-12 text-center text-gray-400">
                      <div className="text-3xl mb-2">👥</div>
                      <p className="font-bold text-gray-700 text-sm">
                        {showFollowModal === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 mb-4">
                        {showFollowModal === 'followers' 
                          ? `@${profileUser.username} hasn't been followed by any users yet.` 
                          : `@${profileUser.username} is not following any accounts yet.`}
                      </p>
                      {profileUser.id === currentUser.id && (
                        <button
                          onClick={() => {
                            setShowFollowModal(null);
                            setShowDiscoverDrawer(true);
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                        >
                          Find People to Follow
                        </button>
                      )}
                    </div>
                  );
                }

                return userList.map(u => {
                  const isFollowingThisUser = (currentUser.followingIds || []).includes(u.id);
                  const uFollowsMe = Boolean(
                    (u.followingIds || []).includes(currentUser.id) || 
                    (currentUser.followersIds || []).includes(u.id)
                  );
                  const isMe = u.id === currentUser.id;

                  return (
                    <div key={u.id} className="flex items-center justify-between gap-3">
                      <div 
                        onClick={() => {
                          setProfileUser(u);
                          setProfileTab('auctions');
                          setShowFollowModal(null);
                        }}
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      >
                        <img 
                          src={u.avatarUrl || `https://i.pravatar.cc/150?u=${u.id}`} 
                          alt={u.username} 
                          className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-gray-900 text-xs truncate">@{u.username}</p>
                            {u.isVerified && (
                              <svg className="w-3 h-3 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                            {uFollowsMe && (
                              <span className="text-[9px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.2 rounded border border-blue-100">
                                Follows you
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 truncate">{u.fullName}</p>
                        </div>
                      </div>

                      {!isMe && (
                        <button
                          onClick={() => handleFollowToggle(u)}
                          disabled={isFollowLoading}
                          className={`text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1 shrink-0 ${
                            isFollowingThisUser
                              ? 'bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 border border-gray-200'
                              : uFollowsMe
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-200 ring-2 ring-blue-400/20'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {isFollowingThisUser ? (
                            'Following'
                          ) : uFollowsMe ? (
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
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Discover & Follow Community Users Modal */}
      {showDiscoverDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-1.5">
                  <span>👥</span>
                  <span>Discover People to Follow</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Find sellers, collectors, and community members</p>
              </div>
              <button 
                onClick={() => {
                  setShowDiscoverDrawer(false);
                  setDiscoverSearch('');
                }}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-gray-100 bg-gray-50">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search members by username or name..."
                  value={discoverSearch}
                  onChange={(e) => setDiscoverSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
              </div>
            </div>

            {/* Candidate User List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(() => {
                const query = discoverSearch.toLowerCase().trim();
                const candidates = allUsers.filter(u => {
                  if (u.id === currentUser.id) return false;
                  if (!query) return true;
                  return (u.username || '').toLowerCase().includes(query) || (u.fullName || '').toLowerCase().includes(query);
                });

                if (candidates.length === 0) {
                  return (
                    <div className="py-12 text-center text-gray-400">
                      <div className="text-3xl mb-2">🔍</div>
                      <p className="font-bold text-gray-700 text-sm">No members found</p>
                      <p className="text-xs text-gray-400 mt-1">Try another search keyword.</p>
                    </div>
                  );
                }

                return candidates.map(u => {
                  const isFollowing = (currentUser.followingIds || []).includes(u.id);
                  const uFollowsMe = Boolean(
                    (u.followingIds || []).includes(currentUser.id) || 
                    (currentUser.followersIds || []).includes(u.id)
                  );

                  return (
                    <div key={u.id} className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-gray-50 transition border border-transparent hover:border-gray-100">
                      <div 
                        onClick={() => {
                          setProfileUser(u);
                          setProfileTab('auctions');
                          setShowDiscoverDrawer(false);
                          setDiscoverSearch('');
                        }}
                        className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                      >
                        <img 
                          src={u.avatarUrl || `https://i.pravatar.cc/150?u=${u.id}`} 
                          alt={u.username}
                          className="w-11 h-11 rounded-full object-cover border border-gray-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-gray-900 text-xs truncate">@{u.username}</p>
                            {u.isVerified && (
                              <svg className="w-3 h-3 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                            {uFollowsMe && (
                              <span className="text-[9px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded border border-blue-100">
                                Follows you
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-gray-500 truncate">{u.fullName}</p>
                          <span className="text-[10px] text-gray-400">{u.followers || 0} followers</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleFollowToggle(u)}
                        disabled={isFollowLoading}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1 shrink-0 ${
                          isFollowing
                            ? 'bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 border border-gray-200'
                            : uFollowsMe
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-200 ring-2 ring-blue-400/20'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isFollowing ? (
                          'Following'
                        ) : uFollowsMe ? (
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
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

        {currentView === 'support' && (
            <HelpSupport currentUser={currentUser} onNavigate={navigate} />
        )}

        {currentView === 'wallet' && (
            <WalletView currentUser={currentUser} onNavigate={navigate} />
        )}

        {currentView === 'admin' && (
            <AdminPanel currentUser={currentUser} onNavigate={navigate} />
        )}
      </main>

      {currentView !== 'settings' && (
        <footer className="glass-panel border-t border-white/40 mt-12 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-12">
            <div>
              <span className="text-2xl font-bold text-gray-900 tracking-tighter italic">Auto<span className="text-red-600">Bid</span></span>
              <p className="mt-4 text-sm text-gray-500 font-medium leading-relaxed">{t.footerAboutText}</p>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-6 uppercase text-xs tracking-wider">{t.auctions}</h4>
              <ul className="space-y-3 text-sm text-gray-600 font-medium">
                <li><a href="#" className="hover:text-red-600 transition-colors">{t.todaysAuctions}</a></li>
                <li><a href="#" className="hover:text-red-600 transition-colors">{t.joinAuction}</a></li>
                <li><a href="#" className="hover:text-red-600 transition-colors">{t.auctionCalendar}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-6 uppercase text-xs tracking-wider">{t.footerServices}</h4>
              <ul className="space-y-3 text-sm text-gray-600 font-medium">
                <li><a href="#" className="hover:text-red-600 transition-colors">{t.transportation}</a></li>
                <li><a href="#" className="hover:text-red-600 transition-colors">{t.conditionReports}</a></li>
                <li><a href="#" className="hover:text-red-600 transition-colors">{t.brokerServices}</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 mb-6 uppercase text-xs tracking-wider">{t.footerSupport}</h4>
              <ul className="space-y-3 text-sm text-gray-600 font-medium">
                <li><a href="#" className="hover:text-red-600 transition-colors">{t.helpCenter}</a></li>
                <li><a href="#" className="hover:text-red-600 transition-colors">{t.contactUs}</a></li>
                <li><a href="#" className="hover:text-red-600 transition-colors">{t.locations}</a></li>
              </ul>
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-6 py-8 border-t border-gray-200/50 text-xs text-gray-400 text-center font-medium">
            {t.footerRights}
          </div>
        </footer>
      )}

      {currentView === 'deleted' && (
         <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 z-50 fixed inset-0">
             <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                 <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 </div>
                 <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Suspended</h2>
                 <p className="text-gray-600 mb-8">
                    Your account has been {currentUser.suspensionStatus === 'permanent' ? 'permanently' : 'temporarily'} suspended by an administrator. You can no longer access the platform features.
                 </p>
                 <button 
                    onClick={async () => {
                       const reason = window.prompt("Please state why your account should be recovered:");
                       if (reason) {
                          try {
                             await setDoc(doc(collection(db, 'appeals')), {
                                userId: currentUser.id,
                                reason,
                                status: 'pending',
                                createdAt: Date.now()
                             });
                             alert("Your appeal has been submitted. An admin will review it shortly.");
                          } catch (err: any) {
                             alert("Error submitting appeal: " + err.message);
                          }
                       }
                    }}
                    className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl mb-4 hover:bg-gray-800 transition-colors"
                 >
                    Submit Appeal
                 </button>
                 <button 
                    onClick={handleLogout}
                    className="w-full text-red-600 font-bold py-3 rounded-xl hover:bg-red-50 transition-colors"
                 >
                    Sign Out
                 </button>
             </div>
         </div>
      )}
      
      {/* Global Identity Verification Modal */}
      {showVerificationModal && currentUser && (
        <IdentityVerificationModal
          currentUser={currentUser}
          isOpen={true}
          onClose={() => setShowVerificationModal(false)}
          onVerificationSubmitted={() => {
            setShowVerificationModal(false);
            alert("Verification request submitted! Once verified by our verification team / admin, your bidding, selling, and event privileges will be active.");
          }}
        />
      )}

      {currentView !== 'deleted' && !showVerificationModal && (
        <BottomNav 
          onNavigate={navigate} 
          activePage={
            currentView === 'wallet'
              ? 'wallet'
              : (currentView === 'settings' 
                ? (settingsSection === 'WALLET' ? 'wallet' : 'settings') 
                : currentView)
          } 
        />
      )}
    </div>
  );
};