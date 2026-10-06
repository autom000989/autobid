export interface CatalogBrand {
  id: string;
  name: string;
  icon?: string;
  country?: string;
  models: string[];
}

export interface VehicleCategory {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  wheelCount?: string;
  brands: CatalogBrand[];
}

export const VEHICLE_CATALOG: VehicleCategory[] = [
  {
    id: 'bike',
    name: 'Bikes & Two-Wheelers',
    shortName: 'Bikes',
    icon: '🏍️',
    wheelCount: '2 Wheels',
    description: 'Motorcycles, scooters, superbikes, cruisers, and commuter two-wheelers',
    brands: [
      {
        id: 'royal-enfield',
        name: 'Royal Enfield',
        icon: '🛡️',
        country: 'India',
        models: ['Classic 350', 'Hunter 350', 'Bullet 350', 'Himalayan 450', 'Meteor 350', 'Continental GT 650', 'Interceptor 650', 'Shotgun 650', 'Scram 411']
      },
      {
        id: 'yamaha',
        name: 'Yamaha',
        icon: '⚡',
        country: 'Japan',
        models: ['YZF-R15 V4', 'MT-15 V2', 'FZ-S FI', 'RayZR 125', 'Aerox 155', 'FZ-X', 'R3', 'MT-03', 'Fascino 125']
      },
      {
        id: 'honda-motorcycles',
        name: 'Honda Motorcycles',
        icon: '🔴',
        country: 'Japan',
        models: ['Activa 6G', 'Shine 125', 'SP 125', 'Hornet 2.0', 'H\'ness CB350', 'Dio 125', 'CB200X', 'CB350RS', 'CBR650R', 'Africa Twin']
      },
      {
        id: 'hero-motocorp',
        name: 'Hero MotoCorp',
        icon: '🔴',
        country: 'India',
        models: ['Splendor Plus', 'HF Deluxe', 'Glamour XTEC', 'Passion Plus', 'Xtreme 160R', 'Xpulse 200 4V', 'Destini 125', 'Karizma XMR', 'Pleasure Plus']
      },
      {
        id: 'bajaj-auto',
        name: 'Bajaj',
        icon: '🔵',
        country: 'India',
        models: ['Pulsar 150', 'Pulsar NS200', 'Pulsar N160', 'Pulsar RS200', 'Dominar 400', 'Platina 110', 'Avenger Cruise 220', 'Chetak EV', 'Freedom 125 CNG']
      },
      {
        id: 'ktm',
        name: 'KTM',
        icon: '🟠',
        country: 'Austria',
        models: ['Duke 200', 'Duke 250', 'Duke 390', 'RC 200', 'RC 390', '250 Adventure', '390 Adventure', '890 Duke R']
      },
      {
        id: 'tvs-motor',
        name: 'TVS Motor',
        icon: '🐎',
        country: 'India',
        models: ['Apache RTR 160 4V', 'Apache RTR 200 4V', 'Apache RR 310', 'Jupiter 125', 'Raider 125', 'Ntorq 125', 'Ronin', 'iQube EV', 'XL100 Heavy Duty']
      },
      {
        id: 'suzuki-motorcycles',
        name: 'Suzuki',
        icon: '🔴',
        country: 'Japan',
        models: ['Access 125', 'Gixxer SF 150', 'Gixxer 250', 'Burgman Street 125', 'Hayabusa', 'V-Strom SX', 'Avenis 125']
      },
      {
        id: 'kawasaki',
        name: 'Kawasaki',
        icon: '🟢',
        country: 'Japan',
        models: ['Ninja 300', 'Ninja 400', 'Ninja 650', 'Ninja ZX-10R', 'Z900', 'Versys 650', 'Vulcan S', 'W175']
      },
      {
        id: 'harley-davidson',
        name: 'Harley-Davidson',
        icon: '🦅',
        country: 'USA',
        models: ['X440', 'Iron 883', 'Fat Boy 114', 'Nightster', 'Pan America 1250', 'Sportster S', 'Street Bob']
      },
      {
        id: 'triumph',
        name: 'Triumph',
        icon: '👑',
        country: 'UK',
        models: ['Speed 400', 'Scrambler 400 X', 'Street Triple 765', 'Tiger 900', 'Bonneville T120', 'Trident 660', 'Rocket 3']
      },
      {
        id: 'bmw-motorrad',
        name: 'BMW Motorrad',
        icon: '⚪',
        country: 'Germany',
        models: ['G 310 R', 'G 310 GS', 'S 1000 RR', 'R 1250 GS', 'F 900 R', 'M 1000 RR', 'C 400 GT']
      },
      {
        id: 'jawa-yezdi',
        name: 'Jawa & Yezdi',
        icon: '⭐',
        country: 'India',
        models: ['Jawa 350', 'Jawa 42 Bobber', 'Yezdi Roadster', 'Yezdi Adventure', 'Yezdi Scrambler']
      },
      {
        id: 'ather-energy',
        name: 'Ather Energy',
        icon: '⚡',
        country: 'India',
        models: ['450X Gen 3', '450S', 'Rizta Family Scooter', '450 Apex']
      },
      {
        id: 'ola-electric',
        name: 'Ola Electric',
        icon: '⚡',
        country: 'India',
        models: ['S1 Pro Gen 2', 'S1 Air', 'S1 X', 'Roadster Electric Motorcycle']
      }
    ]
  },
  {
    id: 'cycle',
    name: 'Bicycles & Cycles',
    shortName: 'Cycles',
    icon: '🚲',
    wheelCount: '2 Wheels',
    description: 'Road bicycles, mountain bikes (MTB), hybrid, commuter and electric cycles',
    brands: [
      {
        id: 'hero-cycles',
        name: 'Hero Cycles',
        icon: '🚲',
        country: 'India',
        models: ['Sprint Pro', 'Kyoto 26T', 'Octane Mountain', 'Compass 29T', 'Lectro C6 E-Cycle', 'Howler 29T', 'Thorn 26T']
      },
      {
        id: 'firefox',
        name: 'Firefox Bikes',
        icon: '🦊',
        country: 'India',
        models: ['Target 29 D', 'Tremor 27.5', 'Cyclone 26', 'Vapour Hybrid', 'Spirit 700C', 'Nexus City', 'Bad Attitude']
      },
      {
        id: 'trek',
        name: 'Trek Bicycles',
        icon: '🏔️',
        country: 'USA',
        models: ['Marlin 5 Gen 3', 'Marlin 7', 'FX 2 Disc', 'Dual Sport 3', 'Domane AL 2', 'Fuel EX 8', 'X-Caliber 8']
      },
      {
        id: 'giant',
        name: 'Giant Bicycles',
        icon: '🚴',
        country: 'Taiwan',
        models: ['ATX 27.5', 'Talon 29', 'Roam 3 Disc', 'Escape 3', 'FastRoad Advanced', 'Defy Advanced 2']
      },
      {
        id: 'montra',
        name: 'Montra Cycles',
        icon: '⚙️',
        country: 'India',
        models: ['Helicon Disc', 'Trance Pro', 'Downtown Hybrid', 'Madrock 29T', 'Rock 1.0', 'Backbeat 27.5']
      },
      {
        id: 'hercules',
        name: 'Hercules',
        icon: '💪',
        country: 'India',
        models: ['Roadeo Hardliner', 'Turbodrive', 'A-100 Disc', 'Streetcat Pro', 'Top Speed 26T', 'Dynor 20T']
      },
      {
        id: 'btwin-decathlon',
        name: 'Btwin / Rockrider',
        icon: '🧗',
        country: 'France',
        models: ['Rockrider ST 100', 'Rockrider ST 520', 'Triban RC 120 Road', 'Riverside 500 Hybrid', 'Elops 520 City']
      },
      {
        id: 'polygon',
        name: 'Polygon Bikes',
        icon: '📐',
        country: 'Indonesia',
        models: ['Cascade 4', 'Premier 5', 'Path 2 Hybrid', 'Xtrada 6', 'Siskiu D7 Full Suspension']
      },
      {
        id: 'scott',
        name: 'Scott Sports',
        icon: '⛷️',
        country: 'Switzerland',
        models: ['Aspect 950', 'Sub Cross 40', 'Speedster 40', 'Scale 970', 'Genius 940']
      }
    ]
  },
  {
    id: 'three-wheeler',
    name: 'Three-Wheelers & Autos',
    shortName: 'Three-Wheelers',
    icon: '🛺',
    wheelCount: '3 Wheels',
    description: 'Auto rickshaws, passenger 3-wheelers, cargo delivery loaders, and E-rickshaws',
    brands: [
      {
        id: 'bajaj-auto-rickshaw',
        name: 'Bajaj Auto Commercial',
        icon: '🛺',
        country: 'India',
        models: ['Compact 4S RE', 'Maxima Z Passenger', 'Maxima C Cargo', 'Maxima XL Cargo', 'RE E-Tec 9.0 Electric', 'Compact CNG Auto']
      },
      {
        id: 'piaggio-ape',
        name: 'Piaggio Ape',
        icon: '🇮🇹',
        country: 'Italy / India',
        models: ['Ape Auto DX Passenger', 'Ape City Plus', 'Ape Xtra LDX Cargo', 'Ape E-City FX Electric', 'Ape E-Xtra Cargo EV', 'Ape Classic 3-Wheeler']
      },
      {
        id: 'mahindra-3w',
        name: 'Mahindra Last Mile Mobility',
        icon: '🚜',
        country: 'India',
        models: ['Alfa Passenger', 'Alfa Cargo', 'Treo Electric Auto', 'Zor Grand Electric Cargo', 'Alfa Load Plus', 'Treo Zor Delivery']
      },
      {
        id: 'tvs-king',
        name: 'TVS King',
        icon: '👑',
        country: 'India',
        models: ['TVS King Deluxe Passenger', 'TVS King Kargo', 'TVS King Duramax CNG', 'TVS King EV']
      },
      {
        id: 'atul-auto',
        name: 'Atul Auto',
        icon: '🚚',
        country: 'India',
        models: ['Gem Paxx Passenger', 'Gem Cargo', 'Elite Passenger EV', 'Rik CNG Auto', 'Gem Delivery Van 3W']
      },
      {
        id: 'kinetic-green',
        name: 'Kinetic Green',
        icon: '⚡',
        country: 'India',
        models: ['Safar Smart E-Rickshaw', 'Safar Jumbo Electric Loader', 'Super DX Passenger', 'Kavach E-Rickshaw']
      },
      {
        id: 'saarthi',
        name: 'Saarthi E-Vehicles',
        icon: '🔋',
        country: 'India',
        models: ['Shavak E-Auto', 'Star Passenger E-Rickshaw', 'DLX E-Cart Cargo', 'Pappu Loader 3W']
      }
    ]
  },
  {
    id: 'cars',
    name: 'Cars & SUVs',
    shortName: 'Cars',
    icon: '🚗',
    wheelCount: '4 Wheels',
    description: 'Hatchbacks, sedans, compact SUVs, full-size luxury SUVs, MUVs, and supercars',
    brands: [
      {
        id: 'maruti-suzuki',
        name: 'Maruti Suzuki',
        icon: '🚗',
        country: 'India / Japan',
        models: ['Swift', 'Baleno', 'Brezza', 'Dzire', 'Ertiga', 'Grand Vitara', 'Fronx', 'WagonR', 'Alto K10', 'Jimny 4x4', 'XL6', 'Ciaz', 'Invicto']
      },
      {
        id: 'hyundai',
        name: 'Hyundai',
        icon: '🇰🇷',
        country: 'South Korea',
        models: ['Creta', 'Venue', 'i20', 'Verna', 'Exter', 'Alcazar', 'Tucson', 'Grand i10 Nios', 'Ioniq 5 EV', 'Kona Electric']
      },
      {
        id: 'tata-motors',
        name: 'Tata Motors Cars',
        icon: '🇮🇳',
        country: 'India',
        models: ['Nexon', 'Punch', 'Harrier', 'Safari', 'Altroz', 'Tiago', 'Tigor', 'Curvv', 'Nexon.ev', 'Punch.ev', 'Tiago.ev']
      },
      {
        id: 'mahindra-suvs',
        name: 'Mahindra SUVs',
        icon: '🏔️',
        country: 'India',
        models: ['Thar 4x4', 'Thar Roxx 5-Door', 'Scorpio-N', 'XUV700', 'XUV 3XO', 'Scorpio Classic', 'Bolero Neo', 'XUV400 EV', 'Marazzo']
      },
      {
        id: 'toyota',
        name: 'Toyota',
        icon: '🇯🇵',
        country: 'Japan',
        models: ['Innova Crysta', 'Innova Hycross', 'Fortuner 4x4', 'Fortuner Legender', 'Urban Cruiser Hyryder', 'Glanza', 'Hilux Pickup', 'Camry Hybrid', 'Vellfire Luxury', 'Land Cruiser 300']
      },
      {
        id: 'kia',
        name: 'Kia',
        icon: '⚡',
        country: 'South Korea',
        models: ['Seltos', 'Sonet', 'Carens', 'EV6', 'Carnival Limousine', 'EV9']
      },
      {
        id: 'honda-cars',
        name: 'Honda Cars',
        icon: '🔴',
        country: 'Japan',
        models: ['City 5th Gen', 'City e:HEV Hybrid', 'Elevate SUV', 'Amaze', 'Civic', 'CR-V']
      },
      {
        id: 'volkswagen',
        name: 'Volkswagen',
        icon: '🇩🇪',
        country: 'Germany',
        models: ['Virtus GT', 'Taigun GT', 'Polo GT TSI', 'Vento', 'Tiguan 4Motion', 'T-Roc']
      },
      {
        id: 'skoda',
        name: 'Skoda',
        icon: '🟢',
        country: 'Czech Republic',
        models: ['Slavia', 'Kushaq', 'Superb', 'Octavia vRS', 'Kodiaq 4x4', 'Kylaq']
      },
      {
        id: 'mg-motor',
        name: 'MG Motor',
        icon: '🇬🇧',
        country: 'UK / China',
        models: ['Hector', 'Hector Plus', 'Astor', 'ZS EV', 'Comet EV', 'Windsor EV', 'Gloster 4x4']
      },
      {
        id: 'bmw',
        name: 'BMW',
        icon: '⚪',
        country: 'Germany',
        models: ['3 Series Gran Limousine', '5 Series', '7 Series', 'X1', 'X3', 'X5 xDrive', 'X7 M60i', 'M3 Competition', 'M5', 'i4 Electric', 'iX Electric']
      },
      {
        id: 'mercedes-benz',
        name: 'Mercedes-Benz',
        icon: '⭐',
        country: 'Germany',
        models: ['C-Class', 'E-Class LWB', 'S-Class', 'GLA 200', 'GLC 300', 'GLE 450', 'GLS 450', 'G 63 AMG (G-Wagon)', 'A-Class Limousine', 'EQS EV']
      },
      {
        id: 'audi',
        name: 'Audi',
        icon: '⭕',
        country: 'Germany',
        models: ['A4 40 TFSI', 'A6 Matrix', 'A8 L', 'Q3 Sportback', 'Q5 Quattro', 'Q7 55 TFSI', 'Q8', 'RS5 Sportback', 'e-tron GT']
      },
      {
        id: 'porsche',
        name: 'Porsche',
        icon: '🐎',
        country: 'Germany',
        models: ['911 Carrera S', '911 GT3 RS', 'Cayenne GTS', 'Macan Turbo', 'Panamera', 'Taycan 4S Turbo', '718 Cayman GT4']
      },
      {
        id: 'land-rover',
        name: 'Land Rover',
        icon: '🌲',
        country: 'UK',
        models: ['Range Rover Autobiography', 'Range Rover Sport', 'Defender 110', 'Defender 90', 'Discovery 5', 'Range Rover Velar', 'Evoque']
      },
      {
        id: 'ford',
        name: 'Ford',
        icon: '🔵',
        country: 'USA',
        models: ['Endeavour 4x4', 'Mustang GT 5.0', 'EcoSport Titanium', 'Figo', 'F-150 Raptor']
      }
    ]
  },
  {
    id: 'trucks',
    name: 'Trucks & Pickups (Mini / LCV)',
    shortName: 'Trucks',
    icon: '🚚',
    wheelCount: '4 - 6 Wheels',
    description: 'Mini trucks, pickup commercial trucks, light commercial vehicles (LCVs), and tippers',
    brands: [
      {
        id: 'tata-commercial-lcv',
        name: 'Tata Commercial Trucks',
        icon: '🚛',
        country: 'India',
        models: ['Tata Ace Gold (Chhota Hathi)', 'Intra V30', 'Intra V50', 'Yodha 2.0 Pickup', '407 Gold SFC', 'Ultra T.7', '709g LPT', '1109 LPT Cowl', '1512 LPT']
      },
      {
        id: 'mahindra-commercial',
        name: 'Mahindra Commercial',
        icon: '🚚',
        country: 'India',
        models: ['Bolero Maxi Truck Plus', 'Bolero Pik-Up ExtraLong', 'Bolero Camper 4x4', 'Supro Profit Truck Mini', 'Furio 7 Cargo', 'Loadking Optimo']
      },
      {
        id: 'ashok-leyland-lcv',
        name: 'Ashok Leyland LCV',
        icon: '🛡️',
        country: 'India',
        models: ['Dost+', 'Bada Dost i4', 'Partner 4 Tyre', 'Partner 6 Tyre', 'Guru 1111', 'Ecomet 1215']
      },
      {
        id: 'isuzu-trucks',
        name: 'Isuzu Commercial',
        icon: '🔴',
        country: 'Japan',
        models: ['D-Max V-Cross 4x4', 'D-Max Regular Cab', 'D-Max S-CAB Commercial', 'D-Max Hi-Lander']
      },
      {
        id: 'eicher-lcv',
        name: 'Eicher Trucks & Buses',
        icon: '🐘',
        country: 'India',
        models: ['Pro 2049', 'Pro 2059', 'Pro 2095XP', 'Pro 2110', 'Pro 2114XP', 'Pro 2119']
      },
      {
        id: 'force-commercial',
        name: 'Force Commercial',
        icon: '📦',
        country: 'India',
        models: ['Kargo King Grand', 'Trax Delivery Van', 'Cruiser Commercial', 'Urbania Cargo']
      },
      {
        id: 'bharatbenz-lcv',
        name: 'BharatBenz Medium Duty',
        icon: '⭐',
        country: 'India / Germany',
        models: ['1015R', '1215R', '1415RE', '1617R Medium Duty Truck']
      }
    ]
  },
  {
    id: '10-wheelers',
    name: '10-Wheelers (Heavy Multi-Axle Trucks)',
    shortName: '10-Wheelers',
    icon: '🚛',
    wheelCount: '10 Wheels (6x2 / 6x4)',
    description: '28-tonne heavy haulage trucks, 10-wheeler tippers, multi-axle cargo haulers, and tankers',
    brands: [
      {
        id: 'tata-10-wheelers',
        name: 'Tata Motors Heavy Trucks',
        icon: '🚛',
        country: 'India',
        models: ['Signa 2823.K Tipper (10W)', 'Signa 2825.K HD Tipper', 'Prima 2830.K Heavy Tipper', 'LPT 2818 Cowl Truck', 'Signa 2821.T Haulage', 'Signa 2825.TK Tipper']
      },
      {
        id: 'ashok-leyland-10w',
        name: 'Ashok Leyland 10-Wheelers',
        icon: '🛡️',
        country: 'India',
        models: ['AVTR 2820 Haulage (10W)', '2825 Tipper 10W', 'AVTR 2822 6x2', '2820 Tipper', 'Ecomet 2820 Cowl']
      },
      {
        id: 'bharatbenz-10w',
        name: 'BharatBenz 10-Wheelers',
        icon: '⭐',
        country: 'India / Germany',
        models: ['BharatBenz 2823R (10W)', 'BharatBenz 2828CH Construction Tipper', 'BharatBenz 2823C Tipper', 'BharatBenz 2828C Heavy Mining 6x4']
      },
      {
        id: 'eicher-10w',
        name: 'Eicher 10-Wheelers',
        icon: '🐘',
        country: 'India',
        models: ['Pro 6028 Haulage (10W)', 'Pro 6028T Heavy Tipper', 'Pro 6028TM RMC Transit Mixer', 'Pro 6028 Cowl']
      },
      {
        id: 'mahindra-blazo-10w',
        name: 'Mahindra Blazo 10-Wheelers',
        icon: '🚚',
        country: 'India',
        models: ['Blazo X 28 Haulage (10W)', 'Blazo X 28 Tipper', 'Furio 28 Heavy Cowl', 'Blazo X 28 RMC Mixer']
      },
      {
        id: 'volvo-10w',
        name: 'Volvo Heavy Construction',
        icon: '🇸🇪',
        country: 'Sweden',
        models: ['Volvo FMX 460 6x4 Mining Tipper', 'Volvo FM 420 6x4 Heavy Hauler']
      },
      {
        id: 'scania-10w',
        name: 'Scania Heavy Commercial',
        icon: '👑',
        country: 'Sweden',
        models: ['Scania G460 6x4 Heavy Tipper', 'Scania P360 Multi-Axle']
      }
    ]
  },
  {
    id: '12-wheelers',
    name: '12-Wheelers & Multi-Axle Trailers',
    shortName: '12-Wheelers',
    icon: '🚛',
    wheelCount: '12 - 16+ Wheels',
    description: '35-tonne to 55-tonne heavy multi-axle freight trucks, container haulers, and tractor trailers',
    brands: [
      {
        id: 'tata-12w-heavy',
        name: 'Tata Heavy Multi-Axle',
        icon: '🚛',
        country: 'India',
        models: ['Signa 3523.T (12-Wheeler)', 'Signa 3525.K Tipper (12W)', 'Signa 4225.T (14-Wheeler)', 'Signa 4825.T (16-Wheeler)', 'Prima 3530.K Mining Tipper', 'Signa 5530.S Tractor Trailer (4x2 / 6x4)', 'Prima 5530.S Heavy Trailer']
      },
      {
        id: 'ashok-leyland-12w',
        name: 'Ashok Leyland Multi-Axle',
        icon: '🛡️',
        country: 'India',
        models: ['AVTR 3520 (12-Wheeler)', 'AVTR 3525 Tipper (12W)', 'AVTR 4120 (14-Wheeler)', 'AVTR 4220 8x2 Multi-Axle', 'AVTR 4825 (16-Wheeler)', 'AVTR 5525 Tractor Trailer (Multi-Axle Puller)']
      },
      {
        id: 'bharatbenz-12w',
        name: 'BharatBenz Heavy Multi-Axle',
        icon: '⭐',
        country: 'India / Germany',
        models: ['BharatBenz 3523R (12-Wheeler)', 'BharatBenz 3528C Tipper (12W)', 'BharatBenz 4228R (14-Wheeler)', 'BharatBenz 5528TT Tractor Trailer Heavy']
      },
      {
        id: 'eicher-12w',
        name: 'Eicher Heavy Commercial',
        icon: '🐘',
        country: 'India',
        models: ['Pro 6035 (12-Wheeler)', 'Pro 6035T Tipper (12W)', 'Pro 6042 (14-Wheeler)', 'Pro 6048 (16-Wheeler)', 'Pro 6055 Tractor Trailer']
      },
      {
        id: 'mahindra-blazo-12w',
        name: 'Mahindra Blazo Multi-Axle',
        icon: '🚚',
        country: 'India',
        models: ['Blazo X 35 (12-Wheeler)', 'Blazo X 35 Tipper (12W)', 'Blazo X 42 (14-Wheeler)', 'Blazo X 55 Tractor Heavy Trailer']
      },
      {
        id: 'volvo-heavy-trailer',
        name: 'Volvo Heavy Multi-Axle',
        icon: '🇸🇪',
        country: 'Sweden',
        models: ['Volvo FMX 500 8x4 Heavy Tipper (12W)', 'Volvo FH 540 6x4 Heavy Puller Trailer', 'Volvo FM 460 Heavy Cargo']
      },
      {
        id: 'scania-heavy-puller',
        name: 'Scania Heavy Trailers',
        icon: '👑',
        country: 'Sweden',
        models: ['Scania G480 8x4 Mining Tipper', 'Scania R580 V8 Heavy Hauler Trailer']
      }
    ]
  },
  {
    id: 'tractors',
    name: 'Tractors & Farm Vehicles',
    shortName: 'Tractors',
    icon: '🚜',
    wheelCount: '4 Wheels',
    description: 'Agricultural tractors, commercial farm haulers, and utility tractors',
    brands: [
      {
        id: 'mahindra-tractors',
        name: 'Mahindra Tractors',
        icon: '🚜',
        country: 'India',
        models: ['Mahindra 575 DI', 'Mahindra 275 DI TU', 'Mahindra 475 DI', 'Arjun Novo 605 DI', 'Jivo 245 DI 4WD', 'Oja 3140']
      },
      {
        id: 'john-deere',
        name: 'John Deere',
        icon: '🦌',
        country: 'USA',
        models: ['5050 D', '5310 4WD PowerTech', '5105', '5405 GearPro', '3028 EN Orchard']
      },
      {
        id: 'swaraj-tractors',
        name: 'Swaraj Tractors',
        icon: '🌾',
        country: 'India',
        models: ['Swaraj 744 FE', 'Swaraj 855 FE', 'Swaraj 735 FE', 'Target 630 4WD', 'Swaraj 963 FE 4WD']
      },
      {
        id: 'sonalika',
        name: 'Sonalika Tractors',
        icon: '☀️',
        country: 'India',
        models: ['Sonalika DI 745 III Sikander', 'Sonalika Tiger DI 50', 'Sonalika DI 35', 'Tiger GT 30 DI 4WD']
      },
      {
        id: 'massey-ferguson',
        name: 'Massey Ferguson (TAFE)',
        icon: '🔴',
        country: 'India / UK',
        models: ['MF 241 DI Maha Shakti', 'MF 1035 DI', 'MF 7250 PowerUp', 'MF 245 DI']
      },
      {
        id: 'new-holland',
        name: 'New Holland',
        icon: '🔵',
        country: 'USA / Italy',
        models: ['3630 TX Plus', '3230 TX Super', '3600-2 TX', 'Excel 4710 4WD']
      }
    ]
  },
  {
    id: 'buses',
    name: 'Buses & Passenger Vans',
    shortName: 'Buses & Vans',
    icon: '🚌',
    wheelCount: '6 - 10 Wheels',
    description: 'Passenger buses, luxury staff coaches, mini buses, and school transport',
    brands: [
      {
        id: 'tata-buses',
        name: 'Tata Passenger Buses',
        icon: '🚌',
        country: 'India',
        models: ['Starbus Ultra Staff Bus', 'Starbus EV City', 'Winger 15S Passenger Van', 'LP 1512 Cowl Bus', 'Marcopolo Luxury Coach']
      },
      {
        id: 'ashok-leyland-buses',
        name: 'Ashok Leyland Buses',
        icon: '🛡️',
        country: 'India',
        models: ['Oyster Staff & School Bus', 'Viking 222 Cowl Chassis', 'MiTR Mini Bus', 'JanBus Low Floor', 'Circuit Electric Bus']
      },
      {
        id: 'force-traveller',
        name: 'Force Traveller & Urbania',
        icon: '🚐',
        country: 'India',
        models: ['Traveller 3050 Mini Bus', 'Traveller 26 Luxury', 'Urbania 14-Seater Luxury Van', 'Trax Cruiser 13-Seater', 'Toofan Classic']
      },
      {
        id: 'eicher-buses',
        name: 'Eicher Skyline & Starline',
        icon: '🐘',
        country: 'India',
        models: ['Skyline Pro 3009 Staff Bus', 'Starline 2070', 'Skyline Pro EV', 'Route Coach 3012']
      },
      {
        id: 'volvo-buses',
        name: 'Volvo Luxury Coaches',
        icon: '🇸🇪',
        country: 'Sweden',
        models: ['Volvo 9600 Multi-Axle Luxury Sleeper', 'Volvo 9400 B11R Intercity', 'Volvo 8400 Low Floor City Bus']
      }
    ]
  }
];
