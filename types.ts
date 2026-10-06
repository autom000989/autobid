export enum DamageType {
  COLLISION = 'Collision',
  FLOOD = 'Flood',
  THEFT = 'Theft Recovery',
  HAIL = 'Hail',
  NORMAL = 'Normal Wear',
  MECHANICAL = 'Mechanical',
}

export enum VehicleStatus {
  PENDING_REVIEW = 'Pending Review',
  UPCOMING = 'Upcoming',
  LIVE = 'Live Auction',
  SOLD = 'Sold',
  DIRECT_SALE = 'Direct Sale',
  BLACKLISTED = 'Blacklisted',
}

export type UserRole = 'admin' | 'finance' | 'accountant' | 'support' | 'employee' | 'user';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type IdDocumentType = 'pan_card' | 'national_id' | 'both';

export interface User {
  id: string;
  username: string;
  email?: string;
  fullName: string;
  avatarUrl: string;
  followers: number;
  following: number;
  bio: string;
  website?: string;
  isVerified?: boolean;
  verificationStatus?: VerificationStatus;
  verifiedAt?: number;
  idDocumentType?: IdDocumentType;
  panNumber?: string;
  nationalIdNumber?: string;
  role?: UserRole;
  deposits?: number;
  createdAt?: number;
  isDeleted?: boolean;
  suspensionStatus?: 'none' | 'temporary' | 'permanent';
  totalCommissionPaid?: number;
  followingIds?: string[];
  followersIds?: string[];
}

export interface UpcomingBid {
  userId: string;
  username: string;
  amount: number;
  timestamp: number;
}

export interface Vehicle {
  id: string;
  ownerId?: string; // Link to a User
  ownerUsername?: string; // Quick reference to the owner's username
  ownerName?: string;
  year: number;
  make: string;
  model: string;
  vehicleType?: string;
  vin: string;
  odometer: number;
  primaryDamage: DamageType;
  secondaryDamage?: string;
  estRetailValue: number;
  currentBid: number;
  startingPrice?: number;
  buyNowPrice?: number;
  location: string;
  imageSeed: number; 
  images?: string[];
  coverImageIndex?: number;
  views?: number;
  interestedCount?: number;
  soldVia?: "bid" | "direct" | "live";
  isBoosted?: boolean;
  status: VehicleStatus;
  startTime?: number;
  endTime: number; 
  watchCount: number;
  hasKeys: boolean;
  engine: string;
  transmission: string;
  drive: string;
  topSpeed?: string;
  mpg?: string;
  fuelType?: string;
  description?: string;
  liveBidDuration?: number;
  listingFee?: number;
  boostOption?: string;
  isUnderInsurance?: boolean;
  hasIssues?: boolean;
  issueDescription?: string;
  vehicleNumber?: string;
  hasRegistrationCard?: boolean;
  rcCardUrl?: string;
  rcCardNumber?: string;
  
  // Upcoming auction pre-bids & live bidding state
  upcomingBids?: UpcomingBid[];
  liveParticipants?: string[];
  firstBidderId?: string;
  firstBidderUsername?: string;
  hasStartedLive?: boolean;
  
  // Selling Mode & Expiry (Auction vs Sell Without Auction / Direct Sale)
  listingType?: 'auction' | 'direct';
  directPrice?: number;
  listedAt?: number;
  expiresAt?: number;
  isBlacklisted?: boolean;
  
  // User specific fields (contextual to the viewer)
  isOwner?: boolean; // If true, viewer owns this
  isWatchlisted?: boolean;
  userBidStatus?: 'none' | 'winning' | 'outbid' | 'won' | 'lost';
  winningUserId?: string;
  winningUsername?: string;
  bidUserIds?: string[];
  boostPlan?: string;
  finalSoldPrice?: number;
  commissionAmount?: number;
}

export interface Bid {
  vehicleId: string;
  amount: number;
  timestamp: number;
}

export type TicketStatus = 'open' | 'closed';

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  status: TicketStatus;
  createdAt: number;
}

export interface AccountAppeal {
  id: string;
  userId: string;
  reason: string;
  type?: 'suspension' | 'verification';
  phone?: string;
  email?: string;
  documents?: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: number;
}

export interface SupportChat {
  id: string;
  userId: string;
  username: string;
  status: 'open' | 'active' | 'closed';
  createdAt: number;
  updatedAt: number;
  unreadCountAdmin?: number;
  unreadCountUser?: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderRole: string;
  text: string;
  timestamp: number;
}
export interface WithdrawalRequest {
  id: string;
  userId: string;
  username: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'drowned';
  createdAt: number;
  userRole?: UserRole;
  payoutMethod?: 'upi' | 'bank' | 'card';
  upiId?: string;
  accountNumber?: string;
  ifsc?: string;
  accountHolderName?: string;
  cardNumber?: string;
  withdrawalOrderId?: string;
  transactionId?: string;
  processedAt?: number;
  adminNote?: string;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  username?: string;
  type: 'deposit_razorpay' | 'admin_add' | 'admin_deduct' | 'withdrawal_payout' | 'withdrawal_refund' | 'commission_deduct';
  amount: number;
  description: string;
  timestamp: number;
  status: 'success' | 'pending' | 'failed';
  paymentId?: string;
  orderId?: string;
  balanceAfter?: number;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  username: string;
  userEmail?: string;
  userFullName?: string;
  documentType: IdDocumentType; // 'pan_card' | 'national_id' | 'both'
  
  // PAN Card Details
  panNumber?: string;
  panCardName?: string;
  panCardPhotoUrl?: string; // photo/scan
  
  // National ID Details (Aadhaar / Voter ID / Passport)
  nationalIdType?: string; // 'Aadhaar Card' | 'Voter ID' | 'Passport' | 'Government ID'
  nationalIdNumber?: string;
  nationalIdName?: string;
  nationalIdPhotoUrl?: string; // front photo
  nationalIdBackPhotoUrl?: string; // back photo
  
  // General Info
  dob?: string;
  status: VerificationStatus; // 'pending' | 'verified' | 'rejected'
  submittedAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  reviewNote?: string;
  rejectionReason?: string;
  
  // AI Pre-validation
  aiValidationStatus?: 'passed' | 'warning' | 'failed' | 'not_applicable';
  aiConfidence?: number;
  aiNotes?: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  adminRole?: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  timestamp: number;
}

export interface ContentBanner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  targetUrl?: string;
  position: 'hero' | 'top_bar' | 'footer' | 'popup';
  isActive: boolean;
  createdAt: number;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percent' | 'flat';
  value: number;
  maxUses: number;
  usedCount: number;
  expiresAt: number;
  isActive: boolean;
  createdAt: number;
  description?: string;
}

export interface DealerPartner {
  id: string;
  userId: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  dealerLicense?: string;
  taxId?: string;
  tier: 'Silver' | 'Gold' | 'Platinum';
  isVerified: boolean;
  status: 'active' | 'pending' | 'suspended';
  activeListingsCount: number;
  totalGmv: number;
  rating: number;
  joinedAt: number;
}

export interface ModerationReport {
  id: string;
  reporterId: string;
  reporterUsername?: string;
  targetType: 'vehicle' | 'user' | 'chat';
  targetId: string;
  targetTitle: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  createdAt: number;
  actionTaken?: string;
  reviewedBy?: string;
}

export interface AppConfig {
  commissionRatePercent: number;
  minBidIncrement: number;
  defaultLiveBidMinutes: number;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowDirectBuy: boolean;
  requireKycToBid: boolean;
  announcementText?: string;
  announcementActive?: boolean;
}

export interface AppVersionInfo {
  currentVersion: string;
  minRequiredVersion: string;
  forceUpdateEnabled: boolean;
  updateMessage: string;
  lastUpdated: number;
}


