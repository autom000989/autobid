import React, { useState, useRef, useEffect } from 'react';
import { analyzeVehicleImage } from '../services/geminiService';
import { Vehicle, DamageType, VehicleStatus, User } from '../types';
import { CAR_BRANDS, COMMON_CAR_MODELS } from '../constants';
import { IdentityVerificationModal } from './IdentityVerificationModal';
import { compressImage } from '../utils/imageCompression';

interface SellCarProps {
  onNavigate: (page: string) => void;
  onListVehicle?: (vehicle: Vehicle) => Promise<boolean | void> | void;
  currentUser?: User;
}

interface UploadedImage {
  url: string;
  base64: string;
  mime: string;
}

export const SellCar: React.FC<SellCarProps> = ({ onNavigate, onListVehicle, currentUser }) => {
  // Step 1: Mode Selection ('auction' vs 'direct')
  // Step 2: Upload Images
  // Step 3: Vehicle Specs
  // Step 4: Pricing & Timing (Auction schedule OR Direct fixed price)
  // Step 5: Additional Information & Condition
  // Step 6: Confirmation & Success
  const [step, setStep] = useState<number>(1);
  const [sellingMode, setSellingMode] = useState<'auction' | 'direct'>('auction');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Uploaded images
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [coverIndex, setCoverIndex] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Registration Card (RC Card) upload
  const [rcCardImage, setRcCardImage] = useState<UploadedImage | null>(null);
  const [isCompressingRc, setIsCompressingRc] = useState(false);
  const rcFileInputRef = useRef<HTMLInputElement>(null);

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Postal Code Lookup
  const [isLoadingPostal, setIsLoadingPostal] = useState(false);
  const [postalError, setPostalError] = useState<string | null>(null);
  const [availableTowns, setAvailableTowns] = useState<string[]>([]);

  const todayStr = new Date().toISOString().split('T')[0];
  const defaultEndTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const defaultEndDateStr = defaultEndTime.toISOString().split('T')[0];

  // 12-Hour AM/PM Time State for Manual Auction Scheduling
  const [startHour, setStartHour] = useState('12');
  const [startMinute, setStartMinute] = useState('00');
  const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>('PM');

  const [endHour, setEndHour] = useState('12');
  const [endMinute, setEndMinute] = useState('30');
  const [endPeriod, setEndPeriod] = useState<'AM' | 'PM'>('PM');

  const convertTo24Hour = (hour12Str: string, minuteStr: string, period: 'AM' | 'PM'): string => {
    let hour = parseInt(hour12Str, 10);
    if (isNaN(hour)) hour = 12;
    if (period === 'AM') {
      if (hour === 12) hour = 0;
    } else {
      if (hour !== 12) hour += 12;
    }
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(hour)}:${minuteStr.padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState({
    // Vehicle Specs
    year: '',
    make: '',
    model: '',
    vin: '',
    odometer: '',
    transmission: 'Automatic',
    fuelType: 'Petrol',
    engine: '',
    vehicleNumber: '',

    // Location
    zipCode: '',
    city: '',
    district: '',
    state: '',
    streetAddress: '',

    // Pricing
    price: '', // Starting Price for Auction OR Fixed Selling Price for Direct Sale
    directBuyPrice: '', // Optional instant buy for auction
    allowDirectBuy: 'no',

    // Auction Specific Schedule
    scheduleType: 'auto', // 'auto' (starts today) | 'manual'
    auctionDate: todayStr,
    auctionStartTime: '12:00',
    auctionEndDate: defaultEndDateStr,
    auctionEndTime: '12:30',
    liveBidDuration: '0',

    // Additional Info & Condition
    hasRegistrationCard: 'yes',
    rcCardNumber: '',
    hasFine: 'no',
    isFirstOwner: 'yes',
    isUnderInsurance: 'yes',
    hasIssues: 'no',
    issueDescription: '',
    description: '',
    boostOption: 'none',
  });

  // Handle image drag & drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    setValidationError(null);
    setIsCompressing(true);
    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          setValidationError('Please upload image files only.');
          continue;
        }
        // High resolution & quality (1920x1440, 0.88) so car details and vehicle condition are crisp and clear
        const compressed = await compressImage(file, 1920, 1440, 0.88);
        setImages(prev => {
          const updated = [...prev, compressed];
          if (updated.length === 1) {
            analyzeFirstImage(compressed.base64, compressed.mime);
          }
          return updated;
        });
      }
    } catch (err: any) {
      console.error('Error compressing image:', err);
      setValidationError('Failed to process image. Please try another image.');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRcFile = async (file: File) => {
    setValidationError(null);
    if (!file.type.startsWith('image/')) {
      setValidationError('Please upload an image file (PNG, JPG, WebP) for your Registration Certificate (RC).');
      return;
    }
    setIsCompressingRc(true);
    try {
      // Compress with high resolution & quality (1920x1440, 0.90) so registration document text, dates, and numbers are crisp and readable
      const compressed = await compressImage(file, 1920, 1440, 0.90);
      setRcCardImage(compressed);
    } catch (err: any) {
      console.error('Error compressing RC card:', err);
      setValidationError('Failed to process RC card. Please try another photo.');
    } finally {
      setIsCompressingRc(false);
    }
  };

  const analyzeFirstImage = async (base64: string, mime: string) => {
    setIsValidating(true);
    try {
      const res = await analyzeVehicleImage(base64, mime);
      if (res.isVehicle) {
        setFormData(prev => ({
          ...prev,
          make: res.make || prev.make,
          model: res.model || prev.model,
          year: res.year || prev.year,
          engine: res.engine || prev.engine,
          fuelType: res.fuelType || prev.fuelType,
        }));
      }
    } catch {
      // Ignore AI auto-fill error
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    if (coverIndex === index) {
      setCoverIndex(0);
    } else if (coverIndex > index) {
      setCoverIndex(coverIndex - 1);
    }
  };

  // Model suggestions on Make change
  useEffect(() => {
    if (formData.make) {
      setIsLoadingModels(true);
      const brandKey = Object.keys(COMMON_CAR_MODELS).find(
        k => k.toLowerCase() === formData.make.toLowerCase()
      );
      if (brandKey && COMMON_CAR_MODELS[brandKey]) {
        setAvailableModels(COMMON_CAR_MODELS[brandKey]);
      } else {
        setAvailableModels([]);
      }
      setIsLoadingModels(false);
    } else {
      setAvailableModels([]);
    }
  }, [formData.make]);

  // Postal Code lookup for India
  const handleZipCodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, zipCode: code }));
    setPostalError(null);

    if (code.length === 6) {
      setIsLoadingPostal(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${code}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice?.length > 0) {
          const po = data[0].PostOffice[0];
          const towns = Array.from(new Set(data[0].PostOffice.map((p: any) => p.Name))) as string[];
          setAvailableTowns(towns);
          setFormData(prev => ({
            ...prev,
            district: po.District || '',
            state: po.State || '',
            city: po.Name || po.District || '',
          }));
        } else {
          setPostalError('PIN code not found.');
        }
      } catch {
        setPostalError('Failed to fetch PIN code data.');
      } finally {
        setIsLoadingPostal(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Listing is 100% FREE (Paid live auction duration fees removed!)
  const calculateListingFee = () => 0;

  // Step Navigations & Validations
  const handleNextStep = () => {
    setValidationError(null);

    if (step === 1) {
      // Mode selected, proceed to image upload
      setStep(2);
      return;
    }

    if (step === 2) {
      if (images.length === 0) {
        setValidationError('Please upload at least one image of your vehicle.');
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!formData.make || !formData.model || !formData.year || !formData.odometer) {
        setValidationError('Please fill in the required vehicle details (Make, Model, Year, Mileage).');
        return;
      }
      setStep(4);
      return;
    }

    if (step === 4) {
      const priceVal = parseInt(formData.price);
      if (!priceVal || priceVal <= 0) {
        setValidationError(sellingMode === 'auction' ? 'Please enter a valid starting bid.' : 'Please enter a valid selling price.');
        return;
      }

      if (sellingMode === 'auction') {
        if (formData.scheduleType === 'manual') {
          const startTime24 = convertTo24Hour(startHour, startMinute, startPeriod);
          const endTime24 = convertTo24Hour(endHour, endMinute, endPeriod);
          const start = new Date(`${formData.auctionDate}T${startTime24}`);
          const end = new Date(`${formData.auctionEndDate}T${endTime24}`);
          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            setValidationError('Please enter valid auction start and end dates and times.');
            return;
          }
          if (end <= start) {
            setValidationError(`Auction end time (${endHour}:${endMinute} ${endPeriod}) must be after the start time (${startHour}:${startMinute} ${startPeriod}).`);
            return;
          }
          if (end.getTime() <= Date.now()) {
            setValidationError('Auction end date & time must be in the future.');
            return;
          }
          const totalAuctionMs = end.getTime() - start.getTime();
          const maxAuctionMs = 14 * 24 * 60 * 60 * 1000; // 14 days max
          if (totalAuctionMs > maxAuctionMs) {
            setValidationError('Auction duration cannot exceed 14 days.');
            return;
          }
        }
      }

      setStep(5);
      return;
    }

    if (step === 5) {
      setStep(6);
      return;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (currentUser && !currentUser.isVerified && currentUser.role !== 'admin') {
      setShowVerificationModal(true);
      return;
    }

    const now = Date.now();
    let startTimeValue: number;
    let endTimeValue: number;
    let initialStatus: VehicleStatus;
    let expiresAt: number;

    if (sellingMode === 'direct') {
      // Sell Without Auction: Fixed price listing for 3 months (90 days)
      startTimeValue = now;
      endTimeValue = now + 90 * 24 * 60 * 60 * 1000;
      expiresAt = endTimeValue;
      initialStatus = VehicleStatus.DIRECT_SALE;
    } else {
      // Sell by Auction: Max 14 days (100% Free Live or Upcoming Auction)
      if (formData.scheduleType === 'manual') {
        const startTime24 = convertTo24Hour(startHour, startMinute, startPeriod);
        const endTime24 = convertTo24Hour(endHour, endMinute, endPeriod);
        const start = new Date(`${formData.auctionDate}T${startTime24}`);
        const end = new Date(`${formData.auctionEndDate}T${endTime24}`);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          setValidationError('Please enter valid auction start and end dates and times.');
          return;
        }
        if (end <= start) {
          setValidationError(`Auction end time (${endHour}:${endMinute} ${endPeriod}) must be after start time (${startHour}:${startMinute} ${startPeriod}).`);
          return;
        }
        if (end.getTime() <= now) {
          setValidationError('Auction end time must be in the future.');
          return;
        }
        const totalAuctionMs = end.getTime() - start.getTime();
        const maxAuctionMs = 14 * 24 * 60 * 60 * 1000;
        if (totalAuctionMs > maxAuctionMs) {
          setValidationError('Auction period cannot be more than 14 days.');
          return;
        }
        startTimeValue = start.getTime();
        endTimeValue = end.getTime();
        expiresAt = endTimeValue;

        // If manual time is in the future (> 1 minute ahead), it's Upcoming; otherwise immediately Live!
        if (startTimeValue > now + 60000) {
          initialStatus = VehicleStatus.UPCOMING;
        } else {
          initialStatus = VehicleStatus.LIVE;
          startTimeValue = Math.min(startTimeValue, now);
        }
      } else {
        // Auto: starts now, default 7 days (within 14 days max)
        startTimeValue = now;
        endTimeValue = now + 7 * 24 * 60 * 60 * 1000;
        expiresAt = endTimeValue;
        initialStatus = VehicleStatus.LIVE;
      }
    }

    const parsedPrice = parseInt(formData.price) || 1000;
    const vehicleId = Date.now().toString();

    const newVehicle: Vehicle = {
      id: vehicleId,
      year: parseInt(formData.year) || new Date().getFullYear(),
      make: formData.make || 'Unknown Make',
      model: formData.model || 'Unknown Model',
      vin: formData.vin || 'N/A',
      odometer: parseInt(formData.odometer) || 0,
      primaryDamage: DamageType.NORMAL,
      secondaryDamage: formData.hasFine === 'yes' ? 'Has Fines' : undefined,
      estRetailValue: Math.round(parsedPrice * 1.2),
      currentBid: parsedPrice,
      startingPrice: parsedPrice,
      directPrice: sellingMode === 'direct' ? parsedPrice : undefined,
      buyNowPrice: sellingMode === 'auction' && formData.allowDirectBuy === 'yes' 
        ? parseInt(formData.directBuyPrice) || Math.round(parsedPrice * 1.5) 
        : undefined,
      location: formData.district && formData.city && formData.district !== formData.city
        ? `${formData.city}, ${formData.district}, ${formData.state}`
        : `${formData.city || formData.district || 'India'}, ${formData.state}`,
      imageSeed: Math.floor(Math.random() * 500),
      images: (() => {
        const arr = images.map(img => img.url);
        if (coverIndex > 0 && coverIndex < arr.length) {
          const [cov] = arr.splice(coverIndex, 1);
          arr.unshift(cov);
        }
        return arr.length > 0 ? arr : [`https://picsum.photos/seed/${vehicleId}/1200/800`];
      })(),
      coverImageIndex: 0,
      status: initialStatus,
      listingType: sellingMode,
      startTime: startTimeValue,
      endTime: endTimeValue,
      listedAt: now,
      expiresAt: expiresAt,
      isBlacklisted: false,
      liveBidDuration: 0,
      watchCount: 0,
      views: 0,
      interestedCount: 0,
      hasKeys: true,
      engine: formData.engine || 'N/A',
      transmission: formData.transmission || 'Automatic',
      drive: 'FWD',
      fuelType: formData.fuelType,
      description: formData.description,
      isOwner: true,
      ownerId: currentUser?.id,
      ownerUsername: currentUser?.username,
      ownerName: currentUser?.fullName || currentUser?.username,
      listingFee: 0,
      boostOption: 'none',
      isUnderInsurance: formData.isUnderInsurance === 'yes',
      hasRegistrationCard: formData.hasRegistrationCard === 'yes',
      rcCardUrl: formData.hasRegistrationCard === 'yes' && rcCardImage ? rcCardImage.url : undefined,
      rcCardNumber: formData.rcCardNumber ? formData.rcCardNumber.toUpperCase().trim() : undefined,
      hasIssues: formData.hasIssues === 'yes',
      issueDescription: formData.hasIssues === 'yes' ? formData.issueDescription : '',
      vehicleNumber: formData.vehicleNumber,
      upcomingBids: [],
      liveParticipants: [],
    };

    if (onListVehicle) {
      setIsSubmitting(true);
      try {
        await onListVehicle(newVehicle);
        setStep(7); // Final success screen
      } catch (err: any) {
        console.error("Vehicle listing error:", err);
        setValidationError(err?.message || "Failed to publish listing. Please check your connection and try again.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setStep(7);
    }
  };

  const stepTitles = sellingMode === 'auction' 
    ? ['Method', 'Images', 'Vehicle Details', 'Auction Pricing', 'Condition & Info', 'Review & Confirm']
    : ['Method', 'Images', 'Vehicle Details', 'Fixed Price', 'Condition & Info', 'Review & Confirm'];

  return (
    <div className="max-w-lg mx-auto px-2.5 sm:px-3 py-2.5 sm:py-3.5">
      {showVerificationModal && (
        <IdentityVerificationModal
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          currentUser={currentUser}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2.5">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight">
            {step === 7 ? 'Listing Published!' : 'Sell Your Vehicle'}
          </h1>
          <p className="text-[10px] sm:text-[11px] text-gray-500">
            {step === 7 ? 'Your vehicle is now listed on AutoBid' : 'Quickly list your car for dynamic auction or direct sale'}
          </p>
        </div>
        <button
          onClick={() => onNavigate('home')}
          className="text-xs font-semibold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-lg transition"
        >
          ✕ Cancel
        </button>
      </div>

      {/* Compact Progress Bar */}
      {step < 7 && (
        <div className="mb-3.5">
          <div className="flex items-center justify-between text-[10px] font-semibold text-gray-500 mb-1 px-0.5">
            <span>Step {step} of 6: <strong className="text-gray-900">{stepTitles[step - 1]}</strong></span>
            <span>{Math.round((step / 6) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-red-600 to-orange-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${(step / 6) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Validation Error Banner */}
      {validationError && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg flex items-center justify-between">
          <span>⚠️ {validationError}</span>
          <button onClick={() => setValidationError(null)} className="text-red-900 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Card Body */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs p-3 sm:p-4">
        {/* STEP 1: Choose Selling Method */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="text-center mb-3">
              <h2 className="text-base sm:text-lg font-bold text-gray-900">Choose How to Sell</h2>
              <p className="text-xs text-gray-500 mt-0.5">Select the selling option that best fits your vehicle</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Sell by Auction */}
              <div 
                onClick={() => setSellingMode('auction')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  sellingMode === 'auction' 
                    ? 'border-red-600 bg-red-50/40 shadow-xs' 
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center text-base font-black">
                    🔨
                  </div>
                  {sellingMode === 'auction' && (
                    <span className="bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                      Selected
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">1) Sell by Auction</h3>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  List for live competitive bidding. Choose immediate live or upcoming start date.
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                  <span className="text-red-600 font-bold">⏱ Duration:</span> Up to 14 Days Max
                </div>
              </div>

              {/* Option 2: Sell Without Auction */}
              <div 
                onClick={() => setSellingMode('direct')}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  sellingMode === 'direct' 
                    ? 'border-emerald-600 bg-emerald-50/40 shadow-xs' 
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-base font-black">
                    🏷️
                  </div>
                  {sellingMode === 'direct' && (
                    <span className="bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                      Selected
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">2) Sell Without Auction</h3>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  Set a fixed asking price. Listed in 'Vehicles For Sale' without countdown pressure.
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center gap-2 text-[10px] text-gray-500 font-medium">
                  <span className="text-emerald-700 font-bold">📅 Validity:</span> 3 Months Listed (Auto-blacklisted after)
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-gray-900 hover:bg-black text-white text-xs font-bold px-5 py-2.5 rounded-lg shadow-sm transition"
              >
                Continue with {sellingMode === 'auction' ? 'Auction' : 'Direct Sale'} →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Upload Images */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm sm:text-base font-bold text-gray-900">Upload Vehicle Images</h2>
              <span className="text-[10px] text-gray-500 font-medium">{images.length} photos uploaded</span>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
                isDragging ? 'border-red-500 bg-red-50/50' : 'border-gray-200 hover:border-gray-400 bg-gray-50/40'
              }`}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileInput} 
                multiple 
                accept="image/*" 
                className="hidden" 
              />
              <div className="w-9 h-9 mx-auto mb-1.5 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-base">
                📷
              </div>
              <p className="text-xs font-bold text-gray-800">Click to upload photos or drag & drop</p>
              <p className="text-[10px] text-gray-400 mt-0.5">PNG, JPG, WebP supported (auto-optimized)</p>
              {isCompressing && (
                <div className="mt-2 text-[10px] font-bold text-amber-600 animate-pulse flex items-center justify-center gap-1.5">
                  <svg className="animate-spin h-3 w-3 text-amber-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Optimizing photo size...</span>
                </div>
              )}
              {isValidating && (
                <div className="mt-2 text-[10px] font-bold text-blue-600 animate-pulse">
                  ✨ AI analyzing vehicle photo...
                </div>
              )}
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 mt-2">
                {images.map((img, i) => (
                  <div key={i} className="relative group aspect-[4/3] rounded-lg overflow-hidden border border-gray-200 bg-slate-900/5 shadow-2xs">
                    <img src={img.url} alt={`upload-${i}`} className="w-full h-full object-cover object-center" />
                    {coverIndex === i && (
                      <span className="absolute top-1 left-1 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                        Cover
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                      {coverIndex !== i && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setCoverIndex(i); }}
                          title="Set as Cover"
                          className="bg-white hover:bg-gray-100 text-gray-900 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs"
                        >
                          Star
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(i); }}
                        title="Remove"
                        className="bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-2"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                disabled={images.length === 0}
                className="bg-gray-900 hover:bg-black text-white text-xs font-bold px-5 py-2 rounded-lg shadow-sm transition disabled:opacity-50"
              >
                Next: Vehicle Specs →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Vehicle Specs */}
        {step === 3 && (
          <div className="space-y-3">
            <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-1">Vehicle Specifications</h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              {/* Make */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Make *</label>
                <input
                  type="text"
                  name="make"
                  list="make-list"
                  value={formData.make}
                  onChange={handleInputChange}
                  placeholder="e.g. Toyota"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/60 focus:bg-white text-xs outline-none"
                />
                <datalist id="make-list">
                  {CAR_BRANDS.map(b => <option key={b} value={b} />)}
                </datalist>
              </div>

              {/* Model */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Model *</label>
                <input
                  type="text"
                  name="model"
                  list="model-list"
                  value={formData.model}
                  onChange={handleInputChange}
                  placeholder="e.g. Fortuner"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/60 focus:bg-white text-xs outline-none"
                />
                <datalist id="model-list">
                  {availableModels.map(m => <option key={m} value={m} />)}
                </datalist>
              </div>

              {/* Year */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Year *</label>
                <input
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={handleInputChange}
                  placeholder="e.g. 2022"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/60 focus:bg-white text-xs outline-none"
                />
              </div>

              {/* Odometer */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Mileage (km) *</label>
                <input
                  type="number"
                  name="odometer"
                  value={formData.odometer}
                  onChange={handleInputChange}
                  placeholder="e.g. 35000"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/60 focus:bg-white text-xs outline-none"
                />
              </div>

              {/* Fuel Type */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Fuel Type</label>
                <select
                  name="fuelType"
                  value={formData.fuelType}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/60 focus:bg-white text-xs outline-none"
                >
                  <option value="Petrol">Petrol</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Electric">Electric</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="CNG">CNG</option>
                </select>
              </div>

              {/* Transmission */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Transmission</label>
                <select
                  name="transmission"
                  value={formData.transmission}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/60 focus:bg-white text-xs outline-none"
                >
                  <option value="Automatic">Automatic</option>
                  <option value="Manual">Manual</option>
                </select>
              </div>

              {/* Vehicle Number */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Registration No.</label>
                <input
                  type="text"
                  name="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={handleInputChange}
                  placeholder="e.g. MH 12 AB 1234"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/60 focus:bg-white text-xs outline-none uppercase"
                />
              </div>

              {/* Engine */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Engine Spec</label>
                <input
                  type="text"
                  name="engine"
                  value={formData.engine}
                  onChange={handleInputChange}
                  placeholder="e.g. 2.8L Turbo"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/60 focus:bg-white text-xs outline-none"
                />
              </div>

              {/* PIN Code */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">PIN Code</label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleZipCodeChange}
                  placeholder="e.g. 400001"
                  maxLength={6}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/60 focus:bg-white text-xs outline-none"
                />
              </div>
            </div>

            {/* City / State display */}
            {(formData.city || formData.district || formData.state) && (
              <div className="bg-gray-50 p-2 rounded-lg text-[11px] text-gray-600 flex items-center gap-2">
                <span>📍 Location:</span>
                <strong>{formData.city || formData.district}, {formData.state}</strong>
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-2"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-gray-900 hover:bg-black text-white text-xs font-bold px-5 py-2 rounded-lg shadow-sm transition"
              >
                Next: Pricing →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Pricing & Schedule */}
        {step === 4 && (
          <div className="space-y-3">
            {sellingMode === 'direct' ? (
              /* PROCESS 2: Sell Without Auction Pricing */
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">🏷️</span>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-gray-900">Set Fixed Selling Price</h2>
                    <p className="text-[11px] text-gray-500">Put the exact price you want to sell the vehicle for</p>
                  </div>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-200 p-3 rounded-xl mb-3">
                  <label className="block text-xs font-bold text-emerald-950 mb-1">
                    Asking Price (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-400 font-bold text-sm">₹</span>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="e.g. 850000"
                      className="w-full pl-7 pr-3 py-2 rounded-lg border border-emerald-300 bg-white text-sm font-bold text-gray-900 outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-emerald-700 mt-1.5">
                    This is your fixed asking price. Interested buyers will contact you or purchase at this fixed rate.
                  </p>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200/80 text-[11px] text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Listing Category:</span>
                    <strong className="text-emerald-700">Vehicles For Sale (Direct Sale)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Listing Validity:</span>
                    <strong className="text-gray-900">3 Months (90 Days)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Blacklist Notice:</span>
                    <span className="text-gray-500">Auto-blacklisted after 3 months if unsold</span>
                  </div>
                </div>
              </div>
            ) : (
              /* PROCESS 1: Sell by Auction Pricing & Schedule */
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-1">Auction Pricing & Timing</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs mb-3">
                  {/* Starting Bid */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                      Starting Bid (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-gray-400 font-bold">₹</span>
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleInputChange}
                        placeholder="e.g. 500000"
                        className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50/60 focus:bg-white text-xs outline-none font-bold"
                      />
                    </div>
                  </div>

                  {/* Schedule Mode */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                      Auction Timing Mode
                    </label>
                    <select
                      name="scheduleType"
                      value={formData.scheduleType}
                      onChange={handleInputChange}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/60 focus:bg-white text-xs outline-none font-semibold text-gray-800"
                    >
                      <option value="auto">Start Immediately (Live Auction)</option>
                      <option value="manual">Custom Date & Time (Live or Upcoming)</option>
                    </select>
                  </div>
                </div>

                {formData.scheduleType === 'auto' && (
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 mb-3 text-xs text-emerald-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                      <span>🔴</span>
                      <span>Immediate Live Auction (100% Free)</span>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Your vehicle will be placed directly in <strong>Live Auction</strong> immediately upon publishing for 7 days. Buyers can place live competitive bids right away!
                    </p>
                  </div>
                )}

                {formData.scheduleType === 'manual' && (
                  <div className="bg-gray-50/90 p-3 rounded-xl border border-gray-200 text-xs space-y-3 mb-3">
                    <div className="text-[11px] text-blue-900 bg-blue-50 border border-blue-200 p-2.5 rounded-lg leading-relaxed">
                      <div className="font-bold flex items-center gap-1 mb-1">
                        <span>🕒</span>
                        <span>Live vs. Upcoming Auction Rules:</span>
                      </div>
                      <p className="text-blue-800">
                        • <strong>Upcoming Auction:</strong> If Start Time is set in the future, it is listed as Upcoming. Any user can participate at the same asking price of <strong>₹{(parseInt(formData.price) || 0).toLocaleString()}</strong>!
                      </p>
                      <p className="text-blue-800 mt-1">
                        • <strong>Live Alerts:</strong> When your upcoming auction starts, all participants and interested users receive instant notifications and email alerts to jump into live competitive bidding!
                      </p>
                      <p className="text-blue-800 mt-1">
                        • <strong>Immediate Live:</strong> If you set Start Time for now/earlier today, it begins as a Live Auction immediately.
                      </p>
                    </div>

                    {/* Start Date & 12-Hour AM/PM Time */}
                    <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1">
                          <span>🟢</span> Auction Start
                        </span>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                          {formData.auctionDate} at {startHour}:{startMinute} {startPeriod}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[9.5px] font-bold text-gray-500 uppercase mb-1">Start Date</label>
                          <input
                            type="date"
                            name="auctionDate"
                            min={todayStr}
                            value={formData.auctionDate}
                            onChange={handleInputChange}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/60 focus:bg-white text-xs outline-none font-semibold text-gray-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[9.5px] font-bold text-gray-500 uppercase mb-1">
                            Start Time (12-Hour • AM / PM)
                          </label>
                          <div className="flex items-center gap-1.5">
                            {/* Hour */}
                            <select
                              value={startHour}
                              onChange={(e) => setStartHour(e.target.value)}
                              className="px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white text-xs font-bold outline-none flex-1"
                            >
                              {['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'].map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                            <span className="font-bold text-gray-400">:</span>
                            {/* Minute */}
                            <select
                              value={startMinute}
                              onChange={(e) => setStartMinute(e.target.value)}
                              className="px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white text-xs font-bold outline-none flex-1"
                            >
                              {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            {/* AM / PM Toggle Buttons */}
                            <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-gray-100 p-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setStartPeriod('AM')}
                                className={`px-2 py-1 text-[10px] font-black rounded transition ${
                                  startPeriod === 'AM'
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                              >
                                AM
                              </button>
                              <button
                                type="button"
                                onClick={() => setStartPeriod('PM')}
                                className={`px-2 py-1 text-[10px] font-black rounded transition ${
                                  startPeriod === 'PM'
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                              >
                                PM
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* End Date & 12-Hour AM/PM Time */}
                    <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1">
                          <span>🏁</span> Auction End (Max 14 Days)
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                          {formData.auctionEndDate} at {endHour}:{endMinute} {endPeriod}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[9.5px] font-bold text-gray-500 uppercase mb-1">End Date</label>
                          <input
                            type="date"
                            name="auctionEndDate"
                            min={formData.auctionDate || todayStr}
                            value={formData.auctionEndDate}
                            onChange={handleInputChange}
                            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/60 focus:bg-white text-xs outline-none font-semibold text-gray-800"
                          />
                        </div>

                        <div>
                          <label className="block text-[9.5px] font-bold text-gray-500 uppercase mb-1">
                            End Time (12-Hour • AM / PM)
                          </label>
                          <div className="flex items-center gap-1.5">
                            {/* Hour */}
                            <select
                              value={endHour}
                              onChange={(e) => setEndHour(e.target.value)}
                              className="px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white text-xs font-bold outline-none flex-1"
                            >
                              {['12', '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11'].map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                            <span className="font-bold text-gray-400">:</span>
                            {/* Minute */}
                            <select
                              value={endMinute}
                              onChange={(e) => setEndMinute(e.target.value)}
                              className="px-2 py-1.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white text-xs font-bold outline-none flex-1"
                            >
                              {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                            {/* AM / PM Toggle Buttons */}
                            <div className="flex rounded-lg border border-gray-200 overflow-hidden bg-gray-100 p-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setEndPeriod('AM')}
                                className={`px-2 py-1 text-[10px] font-black rounded transition ${
                                  endPeriod === 'AM'
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                              >
                                AM
                              </button>
                              <button
                                type="button"
                                onClick={() => setEndPeriod('PM')}
                                className={`px-2 py-1 text-[10px] font-black rounded transition ${
                                  endPeriod === 'PM'
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                              >
                                PM
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-gray-500 px-0.5">
                      <span>ℹ️ Maximum duration: 14 days</span>
                      <span className="font-bold text-emerald-600">✓ 100% Free Live Auction</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-3 border-t border-gray-100 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-2"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-gray-900 hover:bg-black text-white text-xs font-bold px-5 py-2 rounded-lg shadow-sm transition"
              >
                Next: Additional Info →
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Additional Info & Condition */}
        {step === 5 && (
          <div className="space-y-3">
            <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-1">Additional Information</h2>

            {/* Registration Card (RC Card) Question & Document Upload */}
            <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/90 rounded-xl p-3.5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-900 mb-1">
                  Do you have the Vehicle Registration Card (RC Card)? *
                </label>
                <p className="text-[11px] text-gray-500 mb-2">
                  Please specify whether you possess the original or digital Registration Certificate (RC) for this vehicle.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition ${formData.hasRegistrationCard === 'yes' ? 'bg-white border-blue-500 ring-1 ring-blue-400 shadow-xs' : 'bg-white/60 border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="hasRegistrationCard"
                      value="yes"
                      checked={formData.hasRegistrationCard === 'yes'}
                      onChange={handleInputChange}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="leading-tight">
                      <span className="font-bold text-gray-900 block text-xs">Yes, I have RC Card</span>
                      <span className="text-[10px] text-emerald-700 font-medium">Recommended • Verified</span>
                    </div>
                  </label>
                  <label className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition ${formData.hasRegistrationCard === 'no' ? 'bg-white border-blue-500 ring-1 ring-blue-400 shadow-xs' : 'bg-white/60 border-gray-200 hover:border-gray-300'}`}>
                    <input
                      type="radio"
                      name="hasRegistrationCard"
                      value="no"
                      checked={formData.hasRegistrationCard === 'no'}
                      onChange={handleInputChange}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="leading-tight">
                      <span className="font-bold text-gray-900 block text-xs">No RC Card</span>
                      <span className="text-[10px] text-gray-500 font-medium">Pending or Lost</span>
                    </div>
                  </label>
                </div>
              </div>

              {formData.hasRegistrationCard === 'yes' ? (
                <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-xs space-y-2.5">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">📄</span>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">Upload Registration Certificate (RC Card)</h4>
                      <p className="text-[11px] text-gray-600 leading-relaxed mt-0.5">
                        Since you have the RC Card, please upload a clear, high-resolution photo or scan. Vehicles with verified RC cards gain instant buyer trust and attract significantly more bids!
                      </p>
                    </div>
                  </div>

                  {/* RC Card File Input */}
                  <input
                    type="file"
                    ref={rcFileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleRcFile(e.target.files[0]);
                      }
                    }}
                    accept="image/*"
                    className="hidden"
                  />

                  {rcCardImage ? (
                    <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={rcCardImage.url} 
                          alt="RC Card Preview" 
                          className="w-16 h-12 rounded object-cover border border-emerald-300 shadow-xs bg-white shrink-0" 
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                            <span>✓</span> RC Card Uploaded
                          </span>
                          <p className="text-[10px] text-emerald-700 truncate">High-resolution document attached</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => rcFileInputRef.current?.click()}
                          className="text-[10px] font-bold text-gray-700 hover:text-gray-900 bg-white border border-gray-200 px-2 py-1 rounded shadow-xs transition"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={() => setRcCardImage(null)}
                          className="text-[10px] font-bold text-red-600 hover:text-red-800 bg-white border border-gray-200 px-2 py-1 rounded shadow-xs transition"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => rcFileInputRef.current?.click()}
                      className="border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/30 hover:bg-blue-50/60 rounded-lg p-4 text-center cursor-pointer transition"
                    >
                      <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">
                        📷
                      </div>
                      <p className="text-xs font-bold text-blue-900">Click to upload your RC Card photo or scan</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Clear JPEG, PNG, or WebP (processed in crystal clear high resolution)</p>
                      {isCompressingRc && (
                        <div className="mt-2 text-[10px] font-bold text-blue-600 animate-pulse flex items-center justify-center gap-1">
                          <svg className="animate-spin h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                          </svg>
                          <span>Optimizing document resolution...</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Optional RC / Registration Number */}
                  <div className="pt-1">
                    <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">
                      Registration Certificate (RC) Number (Optional)
                    </label>
                    <input
                      type="text"
                      name="rcCardNumber"
                      value={formData.rcCardNumber}
                      onChange={handleInputChange}
                      placeholder="e.g. DL 01 AB 1234 or MH 02 CD 5678"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/60 focus:bg-white text-xs outline-none uppercase font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50/90 border border-amber-200 text-amber-900 p-2.5 rounded-lg text-xs flex items-start gap-2">
                  <span className="text-sm">⚠️</span>
                  <div className="text-[11px] leading-relaxed">
                    <strong>Notice:</strong> Your vehicle will be listed with an <strong>"RC Not Available"</strong> label. Buyers usually prefer vehicles with an existing RC card for hassle-free ownership transfer.
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">First Owner?</label>
                <select
                  name="isFirstOwner"
                  value={formData.isFirstOwner}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/60 focus:bg-white text-xs outline-none"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Insurance Active?</label>
                <select
                  name="isUnderInsurance"
                  value={formData.isUnderInsurance}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/60 focus:bg-white text-xs outline-none"
                >
                  <option value="yes">Yes (Insured)</option>
                  <option value="no">No (Expired)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Pending Fines/Challans?</label>
                <select
                  name="hasFine"
                  value={formData.hasFine}
                  onChange={handleInputChange}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/60 focus:bg-white text-xs outline-none"
                >
                  <option value="no">No Fines</option>
                  <option value="yes">Has Fines</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Any Known Issues or Defects?</label>
              <div className="flex gap-4 text-xs mb-1.5">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="hasIssues"
                    value="no"
                    checked={formData.hasIssues === 'no'}
                    onChange={handleInputChange}
                  />
                  <span>None (Clean Condition)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="hasIssues"
                    value="yes"
                    checked={formData.hasIssues === 'yes'}
                    onChange={handleInputChange}
                  />
                  <span>Yes (Describe below)</span>
                </label>
              </div>
              {formData.hasIssues === 'yes' && (
                <input
                  type="text"
                  name="issueDescription"
                  value={formData.issueDescription}
                  onChange={handleInputChange}
                  placeholder="Describe scratches, dent, or mechanical issue..."
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/60 focus:bg-white text-xs outline-none"
                />
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-500 mb-1">Seller Notes / Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={2}
                placeholder="Share any special features, service history, or reasons for sale..."
                className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50/60 focus:bg-white text-xs outline-none"
              />
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-2"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-gray-900 hover:bg-black text-white text-xs font-bold px-5 py-2 rounded-lg shadow-sm transition"
              >
                Next: Review & Confirm →
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Final Review & Confirmation */}
        {step === 6 && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-1">Review & Confirm Listing</h2>

            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <span className="text-gray-500">Selling Method:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                  sellingMode === 'auction' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {sellingMode === 'auction' ? '🔨 Sell by Auction' : '🏷️ Sell Without Auction (Direct)'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <span className="text-gray-400 text-[10px] block">Vehicle</span>
                  <strong className="text-gray-900">{formData.year} {formData.make} {formData.model}</strong>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">Mileage</span>
                  <strong className="text-gray-900">{parseInt(formData.odometer || '0').toLocaleString()} km</strong>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">
                    {sellingMode === 'auction' ? 'Starting Bid' : 'Selling Price'}
                  </span>
                  <strong className="text-gray-900 text-sm">₹{parseInt(formData.price || '0').toLocaleString()}</strong>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] block">Listing Fee</span>
                  <strong className="text-emerald-700 text-xs">₹0 (100% Free)</strong>
                </div>
                {sellingMode === 'auction' && (
                  <div className="col-span-2 pt-1 border-t border-gray-200">
                    <span className="text-gray-400 text-[10px] block">Auction Schedule & Status</span>
                    <strong className="text-gray-900 text-xs block">
                      {formData.scheduleType === 'auto'
                        ? '🔴 Immediate Live Auction (Active for 7 Days)'
                        : `📅 ${formData.auctionDate} ${startHour}:${startMinute} ${startPeriod} → ${formData.auctionEndDate} ${endHour}:${endMinute} ${endPeriod}`}
                    </strong>
                    {formData.scheduleType === 'manual' && (
                      <span className="text-[10px] text-blue-700 font-semibold block mt-0.5">
                        {new Date(`${formData.auctionDate}T${convertTo24Hour(startHour, startMinute, startPeriod)}`).getTime() > Date.now() + 60000
                          ? 'Starts as Upcoming Auction (Participants join at asking price, alerts sent when live)'
                          : 'Starts as Live Auction immediately'}
                      </span>
                    )}
                  </div>
                )}
                {sellingMode === 'direct' && (
                  <div>
                    <span className="text-gray-400 text-[10px] block">Validity Period</span>
                    <strong className="text-gray-900">3 Months (90 Days)</strong>
                  </div>
                )}
                <div className="col-span-2 pt-1.5 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-gray-500 text-[10.5px]">Registration Card (RC):</span>
                  {formData.hasRegistrationCard === 'yes' ? (
                    <span className="font-bold text-[10.5px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                      <span>✓</span> Available {rcCardImage ? '(Document Uploaded)' : '(No document attached)'}
                    </span>
                  ) : (
                    <span className="font-bold text-[10.5px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Not Available
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-gray-500 bg-blue-50 border border-blue-200 p-2.5 rounded-lg leading-relaxed">
              ℹ️ {sellingMode === 'auction' 
                ? 'Your vehicle will be listed in the auction feed completely free of charge. When live, participants compete in real bidding, with the highest bidder winning at conclusion!' 
                : 'Your vehicle will be listed in "Vehicles For Sale". It will remain active for 3 months, after which it will be auto-blacklisted if not sold.'}
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStep(5)}
                className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-3 py-2 disabled:opacity-50"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 disabled:opacity-60 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md transition flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Publishing Listing...</span>
                  </>
                ) : (
                  <span>Confirm & Publish Listing</span>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 7: Success Screen */}
        {step === 7 && (
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3 text-xl font-bold">
              ✓
            </div>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
              Vehicle Successfully Listed!
            </h2>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-4 leading-relaxed">
              {sellingMode === 'direct' 
                ? 'Your vehicle is now live under "Vehicles For Sale" and in your profile for the next 3 months.' 
                : 'Your auction listing is published and visible on the platform and in your profile.'}
            </p>

            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition"
              >
                Browse Vehicles
              </button>
              <button
                type="button"
                onClick={() => onNavigate('profile')}
                className="bg-gray-900 hover:bg-black text-white text-xs font-bold px-4 py-2 rounded-lg transition"
              >
                View in My Profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
