export interface DistrictData {
  district: string;
  districtBn: string;
  aliases?: string[];
  upazilas: string[];
}

export const BANGLADESH_DISTRICTS: DistrictData[] = [
  { district: 'Bagerhat', districtBn: 'বাগেরহাট', upazilas: ['Bagerhat Sadar', 'Chitalmari', 'Fakirhat', 'Kachua', 'Mollahat', 'Mongla', 'Morrelganj', 'Rampal', 'Sarankhola'] },
  { district: 'Bandarban', districtBn: 'বান্দরবান', upazilas: ['Bandarban Sadar', 'Ali Kadam', 'Lama', 'Naikhongchhari', 'Rowangchhari', 'Ruma', 'Thanchi'] },
  { district: 'Barguna', districtBn: 'বরগুনা', upazilas: ['Barguna Sadar', 'Amtali', 'Bamna', 'Betagi', 'Pathorghata', 'Taltali'] },
  { district: 'Barishal', districtBn: 'বরিশাল', aliases: ['Barisal', 'বরিশাল'], upazilas: ['Barishal Sadar', 'Agailjhara', 'Babuganj', 'Bakerganj', 'Banaripara', 'Gournadi', 'Hizla', 'Mehendiganj', 'Muladi', 'Wazirpur'] },
  { district: 'Bhola', districtBn: 'ভোলা', upazilas: ['Bhola Sadar', 'Burhanuddin', 'Char Fasson', 'Daulatkhan', 'Lalmohan', 'Manpura', 'Tazumuddin'] },
  { district: 'Bogura', districtBn: 'বগুড়া', aliases: ['Bogra', 'বগুড়া', 'বগুড়া'], upazilas: ['Bogra Sadar', 'Adamdighi', 'Dhunat', 'Dhupchanchia', 'Gabtali', 'Kahaloo', 'Nandigram', 'Sariakandi', 'Shahjahanpur', 'Sherpur', 'Shibganj'] },
  { district: 'Brahmanbaria', districtBn: 'ব্রাহ্মণবাড়িয়া', aliases: ['Brahmanbaria', 'Bramonbaria', 'ব্রাহ্মণবাড়িয়া', 'ব্রাহ্মণবাড়িয়া'], upazilas: ['Brahmanbaria Sadar', 'Akhaura', 'Ashuganj', 'Bancharampur', 'Bijoynagar', 'Kasba', 'Nabinagar', 'Nasirnagar', 'Sarail'] },
  { district: 'Chandpur', districtBn: 'চাঁদপুর', upazilas: ['Chandpur Sadar', 'Faridganj', 'Haimchar', 'Haziganj', 'Kachua', 'Matlab Dakshin', 'Matlab Uttar', 'Shahrasti'] },
  { district: 'Chattogram', districtBn: 'চট্টগ্রাম', aliases: ['Chittagong', 'Chattagram', 'চট্টগ্রাম', 'চট্রগ্রাম'], upazilas: ['Chattogram Sadar', 'Anwara', 'Banshkhali', 'Boalkhali', 'Chandanaish', 'Fatikchhari', 'Hathazari', 'Karnaphuli', 'Lohagara', 'Mirsharai', 'Patiya', 'Rangunia', 'Raozan', 'Sandwip', 'Satkania', 'Sitakunda'] },
  { district: 'Chuadanga', districtBn: 'চুয়াডাঙ্গা', aliases: ['চুয়াডাঙ্গা', 'চুয়াডাঙ্গা'], upazilas: ['Chuadanga Sadar', 'Alamdanga', 'Damurhuda', 'Jibannagar'] },
  { district: 'Cumilla', districtBn: 'কুমিল্লা', aliases: ['Comilla', 'কুমিল্লা'], upazilas: ['Cumilla Sadar', 'Barura', 'Brahmanpara', 'Burichang', 'Chandina', 'Chauddagram', 'Daudkandi', 'Debidwar', 'Homna', 'Laksam', 'Lalmai', 'Meghna', 'Monohorgonj', 'Muradnagar', 'Nangalkot', 'Sadar Dakshin', 'Titas'] },
  { district: "Cox's Bazar", districtBn: 'কক্সবাজার', aliases: ['Coxs Bazar', 'Coxsbazar', 'কক্সবাজার'], upazilas: ["Cox's Bazar Sadar", 'Chakaria', 'Kutubdia', 'Maheshkhali', 'Pekua', 'Ramu', 'Teknaf', 'Ukhia'] },
  { district: 'Dhaka', districtBn: 'ঢাকা', aliases: ['Dhaka', 'ঢাকা'], upazilas: ['Dhaka Sadar', 'Adabor', 'Badda', 'Bangshal', 'Bimanbandar', 'Cantonment', 'Chawkbazar', 'Dakshinkhan', 'Darus Salam', 'Demra', 'Dhamrai', 'Dhanmondi', 'Dohar', 'Gendaria', 'Gulshan', 'Hazaribagh', 'Jatrabari', 'Kadamtali', 'Kafrul', 'Kalabagan', 'Kamrangirchar', 'Keraniganj', 'Khilgaon', 'Khilkhet', 'Kotwali', 'Lalbagh', 'Mirpur', 'Mohammadpur', 'Motijheel', 'Nawabganj', 'New Market', 'Pallabi', 'Paltan', 'Ramna', 'Rampura', 'Sabujbagh', 'Savar', 'Shah Ali', 'Shahbagh', 'Sher-e-Bangla Nagar', 'Shyampur', 'Sutrapur', 'Tejgaon', 'Tejgaon Industrial Area', 'Turag', 'Uttara', 'Uttar Khan'] },
  { district: 'Dinajpur', districtBn: 'দিনাজপুর', upazilas: ['Dinajpur Sadar', 'Birampur', 'Birganj', 'Bochaganj', 'Chirirbandar', 'Fulbari', 'Ghoraghat', 'Hakimpur', 'Kaharole', 'Khansama', 'Nawabganj', 'Parbatipur'] },
  { district: 'Faridpur', districtBn: 'ফরিদপুর', upazilas: ['Faridpur Sadar', 'Alfadanga', 'Bhanga', 'Boalmari', 'Charbhadrasan', 'Madhukhali', 'Nagarkanda', 'Sadarpur', 'Saltha'] },
  { district: 'Feni', districtBn: 'ফেনী', upazilas: ['Feni Sadar', 'Chhagalnaiya', 'Daganbhuiyan', 'Fulgazi', 'Parshuram', 'Sonagazi'] },
  { district: 'Gaibandha', districtBn: 'গাইবান্ধা', aliases: ['গাইবান্দা', 'গাইবান্ধা'], upazilas: ['Gaibandha Sadar', 'Fulchhari', 'Gobindaganj', 'Palashbari', 'Sadullapur', 'Saghata', 'Sundarganj'] },
  { district: 'Gazipur', districtBn: 'গাজীপুর', upazilas: ['Gazipur Sadar', 'Kaliakair', 'Kaliganj', 'Kapasia', 'Sreepur', 'Tongi'] },
  { district: 'Gopalganj', districtBn: 'গোপালগঞ্জ', upazilas: ['Gopalganj Sadar', 'Kashiani', 'Kotalipara', 'Muksudpur', 'Tungipara'] },
  { district: 'Habiganj', districtBn: 'হবিগঞ্জ', aliases: ['Hobiganj', 'Hobigonj', 'হবিগঞ্জ'], upazilas: ['Habiganj Sadar', 'Ajmiriganj', 'Bahubal', 'Baniachong', 'Chunarughat', 'Lakhai', 'Madhabpur', 'Nabiganj', 'Shayestaganj'] },
  { district: 'Jamalpur', districtBn: 'জামালপুর', upazilas: ['Jamalpur Sadar', 'Baksiganj', 'Dewanganj', 'Islampur', 'Madarganj', 'Melandaha', 'Sarishabari'] },
  { district: 'Jashore', districtBn: 'যশোর', aliases: ['Jessore', 'যশোর'], upazilas: ['Jashore Sadar', 'Abhaynagar', 'Bagherpara', 'Chaugachha', 'Jhikargachha', 'Keshabpur', 'Manirampur', 'Sharsha'] },
  { district: 'Jhalokathi', districtBn: 'ঝালকাঠি', aliases: ['Jhalakati', 'Jhalakathi', 'ঝালকাঠি', 'ঝালকাঠী'], upazilas: ['Jhalokathi Sadar', 'Kanthalia', 'Nalchity', 'Rajapur'] },
  { district: 'Jhenaidah', districtBn: 'ঝিনাইদহ', upazilas: ['Jhenaidah Sadar', 'Harinakunda', 'Kaliganj', 'Kotchandpur', 'Maheshpur', 'Shailkupa'] },
  { district: 'Joypurhat', districtBn: 'জয়পুরহাট', aliases: ['জয়পুরহাট', 'জয়পুরহাট'], upazilas: ['Joypurhat Sadar', 'Akkelpur', 'Kalai', 'Khetlal', 'Panchbibi'] },
  { district: 'Khagrachhari', districtBn: 'খাগড়াছড়ি', aliases: ['Khagrachari', 'খাগড়াছড়ি', 'খাগড়াছড়ি'], upazilas: ['Khagrachhari Sadar', 'Dighinala', 'Guimara', 'Lakshmichhari', 'Mahalchhari', 'Manaikchhari', 'Matiranga', 'Panchhari', 'Ramgarh'] },
  { district: 'Khulna', districtBn: 'খুলনা', upazilas: ['Khulna Sadar', 'Batiaghata', 'Dacope', 'Dumuria', 'Dighalia', 'Koyra', 'Paikgachha', 'Phultala', 'Rupsha', 'Terokhada', 'Daulatpur', 'Khalishpur', 'Khan Jahan Ali', 'Sonadanga', 'Harintana'] },
  { district: 'Kishoreganj', districtBn: 'কিশোরগঞ্জ', upazilas: ['Kishoreganj Sadar', 'Austagram', 'Bajitpur', 'Bhairab', 'Hossainpur', 'Itna', 'Karimganj', 'Katiadi', 'Kuliarchar', 'Mithamain', 'Nikli', 'Pakundia', 'Tarail'] },
  { district: 'Kurigram', districtBn: 'কুড়িগ্রাম', aliases: ['কুড়িগ্রাম', 'কুড়িগ্রাম'], upazilas: ['Kurigram Sadar', 'Bhurungamari', 'Char Rajibpur', 'Chilmari', 'Phulbari', 'Rajarhat', 'Rajibpur', 'Roumari', 'Ulipur'] },
  { district: 'Kushtia', districtBn: 'কুষ্টিয়া', aliases: ['কুষ্টিয়া', 'কুষ্টিয়া'], upazilas: ['Kushtia Sadar', 'Bheramara', 'Daulatpur', 'Khoksa', 'Kumarkhali', 'Mirpur'] },
  { district: 'Lakshmipur', districtBn: 'লক্ষ্মীপুর', aliases: ['Laxmipur', 'লক্ষ্মীপুর', 'লক্ষীপুর'], upazilas: ['Lakshmipur Sadar', 'Kamalnagar', 'Raipur', 'Ramganj', 'Ramgati'] },
  { district: 'Lalmonirhat', districtBn: 'লালমনিরহাট', upazilas: ['Lalmonirhat Sadar', 'Aditmari', 'Hatibandha', 'Kaliganj', 'Patgram'] },
  { district: 'Madaripur', districtBn: 'মাদারীপুর', upazilas: ['Madaripur Sadar', 'Dasar', 'Kalkini', 'Rajoir', 'Shibchar'] },
  { district: 'Magura', districtBn: 'মাগুরা', upazilas: ['Magura Sadar', 'Mohammadpur', 'Shalikha', 'Sreepur'] },
  { district: 'Manikganj', districtBn: 'মানিকগঞ্জ', upazilas: ['Manikganj Sadar', 'Daulatpur', 'Gior', 'Harirampur', 'Saturia', 'Shivalaya', 'Singair'] },
  { district: 'Meherpur', districtBn: 'মেহেরপুর', upazilas: ['Meherpur Sadar', 'Gangni', 'Mujibnagar'] },
  { district: 'Moulvibazar', districtBn: 'মৌলভীবাজার', aliases: ['Maulvibazar', 'Moulvibazar', 'মৌলভীবাজার'], upazilas: ['Moulvibazar Sadar', 'Barlekha', 'Juri', 'Kamalganj', 'Kulaura', 'Rajnagar', 'Sreemangal'] },
  { district: 'Munshiganj', districtBn: 'মুন্সীগঞ্জ', aliases: ['Munshigonj', 'মুন্সীগঞ্জ', 'মুন্সিগঞ্জ'], upazilas: ['Munshiganj Sadar', 'Gazaria', 'Lohajang', 'Sirajdikhan', 'Sreenagar', 'Tongibari'] },
  { district: 'Mymensingh', districtBn: 'ময়মনসিংহ', aliases: ['ময়মনসিংহ', 'ময়মনসিংহ'], upazilas: ['Mymensingh Sadar', 'Bhaluka', 'Dhobaura', 'Fulbaria', 'Gaffargaon', 'Gauripur', 'Haluaghat', 'Ishwarganj', 'Muktagachha', 'Nandail', 'Phulpur', 'Tara Khanda', 'Trishal'] },
  { district: 'Naogaon', districtBn: 'নওগাঁ', upazilas: ['Naogaon Sadar', 'Atrai', 'Badalgachhi', 'Dhamoirhat', 'Manda', 'Mohadevpur', 'Niamatpur', 'Patnitala', 'Porsha', 'Raninagar', 'Sapahar'] },
  { district: 'Narail', districtBn: 'নড়াইল', aliases: ['নড়াইল', 'নড়াইল'], upazilas: ['Narail Sadar', 'Kalia', 'Lohagara'] },
  { district: 'Narayanganj', districtBn: 'নারায়ণগঞ্জ', aliases: ['Narayangonj', 'নারায়ণগঞ্জ', 'নারায়ণগঞ্জ'], upazilas: ['Narayanganj Sadar', 'Araihazar', 'Bandar', 'Rupganj', 'Sonargaon'] },
  { district: 'Narsingdi', districtBn: 'নরসিংদী', upazilas: ['Narsingdi Sadar', 'Belabo', 'Monohardi', 'Palash', 'Raipura', 'Shibpur'] },
  { district: 'Natore', districtBn: 'নাটোর', upazilas: ['Natore Sadar', 'Bagatipara', 'Baraigram', 'Gurudaspur', 'Lalpur', 'Naldanga', 'Singra'] },
  { district: 'Netrokona', districtBn: 'নেত্রকোণা', aliases: ['Netrakona', 'নেত্রকোণা', 'নেত্রকোনা'], upazilas: ['Netrokona Sadar', 'Atpara', 'Barhatta', 'Durgapur', 'Kalmakanda', 'Kendua', 'Khaliajuri', 'Madan', 'Mohanganj', 'Purbadhala'] },
  { district: 'Nilphamari', districtBn: 'নীলফামারী', upazilas: ['Nilphamari Sadar', 'Dimla', 'Domar', 'Jaldhaka', 'Kishoreganj', 'Saidpur'] },
  { district: 'Noakhali', districtBn: 'নোয়াখালী', aliases: ['নোয়াখালী', 'নোয়াখালী'], upazilas: ['Noakhali Sadar', 'Begumganj', 'Chatkhil', 'Companiganj', 'Hatiya', 'Kabirhat', 'Senbagh', 'Subarnachar', 'Sonaimuri'] },
  { district: 'Pabna', districtBn: 'পাবনা', upazilas: ['Pabna Sadar', 'Atgharia', 'Bera', 'Bhangura', 'Chatmohar', 'Faridpur', 'Ishwardi', 'Santhia', 'Sujanagar'] },
  { district: 'Panchagarh', districtBn: 'পঞ্চগড়', aliases: ['Panchagar', 'পঞ্চগড়', 'পঞ্চগড়'], upazilas: ['Panchagarh Sadar', 'Atwari', 'Boda', 'Debiganj', 'Tetulia'] },
  { district: 'Patuakhali', districtBn: 'পটুয়াখালী', aliases: ['পটুয়াখালী', 'পটুয়াখালী'], upazilas: ['Patuakhali Sadar', 'Bauphal', 'Dashmina', 'Dumki', 'Galachipa', 'Kalapara', 'Mirzaganj', 'Rangabali'] },
  { district: 'Pirojpur', districtBn: 'পিরোজপুর', upazilas: ['Pirojpur Sadar', 'Bhandaria', 'Kawkhali', 'Mathbaria', 'Nazirpur', 'Nesarabad', 'Zianagar'] },
  { district: 'Rajbari', districtBn: 'রাজবাড়ী', aliases: ['রাজবাড়ি', 'রাজবাড়ী'], upazilas: ['Rajbari Sadar', 'Baliakandi', 'Goalandaghat', 'Kalukhali', 'Pangsha'] },
  { district: 'Rajshahi', districtBn: 'রাজশাহী', upazilas: ['Rajshahi Sadar', 'Bagha', 'Bagmara', 'Charghat', 'Durgapur', 'Godagari', 'Mohanpur', 'Paba', 'Puthia', 'Tanore'] },
  { district: 'Rangamati', districtBn: 'রাঙ্গামাটি', aliases: ['রাঙামাটি', 'রাঙ্গামাটি'], upazilas: ['Rangamati Sadar', 'Bagaichhari', 'Barkal', 'Belaichhari', 'Juraichhari', 'Kaptai', 'Karnafuli', 'Langadu', 'Naniarchar', 'Rajasthali'] },
  { district: 'Rangpur', districtBn: 'রংপুর', upazilas: ['Rangpur Sadar', 'Badarganj', 'Gangachhara', 'Kaunia', 'Mithapukur', 'Pirgachha', 'Pirganj', 'Taraganj'] },
  { district: 'Satkhira', districtBn: 'সাতক্ষীরা', upazilas: ['Satkhira Sadar', 'Assasuni', 'Debhata', 'Kalaroa', 'Kaliganj', 'Shyamnagar', 'Tala'] },
  { district: 'Shariatpur', districtBn: 'শরীয়তপুর', aliases: ['Shariatpur', 'শরীয়তপুর', 'শরীয়তপুর'], upazilas: ['Shariatpur Sadar', 'Bhedarganj', 'Damudya', 'Gosairhat', 'Naria', 'Zanjira'] },
  { district: 'Sherpur', districtBn: 'শেরপুর', upazilas: ['Sherpur Sadar', 'Jhenaigati', 'Nakla', 'Nalitabari', 'Sreebordi'] },
  { district: 'Sirajganj', districtBn: 'সিরাজগঞ্জ', aliases: ['Sirajgonj', 'সিরাজগঞ্জ'], upazilas: ['Sirajganj Sadar', 'Belkuchi', 'Chauhali', 'Kamarkhanda', 'Kazipur', 'Raiganj', 'Shahjadpur', 'Tarash', 'Ullahpara'] },
  { district: 'Sunamganj', districtBn: 'সুনামগঞ্জ', aliases: ['Sunamgonj', 'সুনামগঞ্জ'], upazilas: ['Sunamganj Sadar', 'Bishwamvarpur', 'Chhatak', 'Derai', 'Dharamapassa', 'Dowarabazar', 'Jagannathpur', 'Jamalganj', 'Shanthiganj', 'Sullah', 'Tahirpur'] },
  { district: 'Sylhet', districtBn: 'সিলেট', upazilas: ['Sylhet Sadar', 'Balaganj', 'Beanibazar', 'Bishwanath', 'Companiganj', 'Dakshin Surma', 'Fenchuganj', 'Golapganj', 'Gowainghat', 'Jaintiapur', 'Kanaighat', 'Osmani Nagar', 'Zakiganj'] },
  { district: 'Tangail', districtBn: 'টাঙ্গাইল', upazilas: ['Tangail Sadar', 'Basail', 'Bhuapur', 'Delduar', 'Dhanbari', 'Ghatail', 'Gopalpur', 'Kalihati', 'Madhupur', 'Mirzapur', 'Nagarpur', 'Sakhipur'] },
  { district: 'Thakurgaon', districtBn: 'ঠাকুরগাঁও', aliases: ['ঠাকুরগাও', 'ঠাকুরগাঁও'], upazilas: ['Thakurgaon Sadar', 'Baliadangi', 'Haripur', 'Pirganj', 'Ranisankail'] }
];

/**
 * Normalizes text for loose comparison:
 * removes punctuation, collapses spaces, and turns into lower-case.
 */
function normalizeGeoStr(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[\s\-_',./\\]+/g, ' ')
    .trim();
}

/**
 * Find District Data object by any English or Bengali name or alias.
 */
export function findDistrictData(districtKey?: string | null): DistrictData | undefined {
  if (!districtKey) return undefined;
  const target = normalizeGeoStr(districtKey);
  if (!target) return undefined;

  return BANGLADESH_DISTRICTS.find(d => {
    const en = normalizeGeoStr(d.district);
    const bn = normalizeGeoStr(d.districtBn);
    if (target === en || target === bn) return true;
    if (en.includes(target) || target.includes(en)) return true;
    if (bn.includes(target) || target.includes(bn)) return true;
    if (d.aliases && d.aliases.some(a => {
      const na = normalizeGeoStr(a);
      return target === na || na.includes(target) || target.includes(na);
    })) {
      return true;
    }
    return false;
  });
}

/**
 * Checks if a location entity (Shop, Mosque, Order, User) matches a target district.
 * Inspects district field, address, area, upazila, etc.
 */
export function isLocationMatchingDistrict(
  item: {
    district?: string | null;
    upazila?: string | null;
    upazilaThana?: string | null;
    area?: string | null;
    address?: string | null;
    shopAddress?: string | null;
    locationAddress?: string | null;
    fullAddress?: string | null;
  },
  targetDistrict: string
): boolean {
  if (!targetDistrict) return true;
  const distData = findDistrictData(targetDistrict);
  
  // Build lookup words
  const wordsToMatch: string[] = [];
  if (distData) {
    wordsToMatch.push(distData.district.toLowerCase());
    wordsToMatch.push(distData.districtBn);
    if (distData.aliases) {
      distData.aliases.forEach(a => wordsToMatch.push(a.toLowerCase()));
    }
  } else {
    wordsToMatch.push(targetDistrict.toLowerCase());
  }

  // 1. Direct district match
  const itemDist = normalizeGeoStr(item.district);
  if (itemDist) {
    for (const w of wordsToMatch) {
      const nw = normalizeGeoStr(w);
      if (itemDist === nw || itemDist.includes(nw) || nw.includes(itemDist)) {
        return true;
      }
    }
  }

  // 2. Address / Area / Full address string matching
  const combinedText = [
    item.district,
    item.upazila,
    item.upazilaThana,
    item.area,
    item.address,
    item.shopAddress,
    item.locationAddress,
    item.fullAddress
  ].filter(Boolean).join(' ').toLowerCase();

  for (const w of wordsToMatch) {
    if (combinedText.includes(w.toLowerCase())) {
      return true;
    }
  }

  // 3. Upazila-based match: if the item's upazila belongs to this district
  if (distData && distData.upazilas && distData.upazilas.length > 0) {
    const itemUpazila = [item.upazila, item.upazilaThana, item.area].filter(Boolean).join(' ').toLowerCase();
    if (itemUpazila) {
      for (const up of distData.upazilas) {
        const cleanUp = up.toLowerCase().replace(/\s+sadar$/i, '').trim();
        if (cleanUp.length >= 3 && itemUpazila.includes(cleanUp)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Checks if a location entity matches a target upazila/thana.
 */
export function isLocationMatchingUpazila(
  item: {
    upazila?: string | null;
    upazilaThana?: string | null;
    area?: string | null;
    address?: string | null;
    shopAddress?: string | null;
    locationAddress?: string | null;
  },
  targetUpazila: string
): boolean {
  if (!targetUpazila) return true;
  const target = targetUpazila.toLowerCase().replace(/\s+sadar$/i, '').trim();
  if (!target) return true;

  const combined = [
    item.upazila,
    item.upazilaThana,
    item.area,
    item.address,
    item.shopAddress,
    item.locationAddress
  ].filter(Boolean).join(' ').toLowerCase();

  return combined.includes(target) || combined.includes(targetUpazila.toLowerCase());
}

