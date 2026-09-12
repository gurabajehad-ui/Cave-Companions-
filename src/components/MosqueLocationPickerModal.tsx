import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  Search,
  Navigation,
  CheckCircle2,
  X,
  AlertCircle,
  Compass,
  RotateCw
} from 'lucide-react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useLanguage } from '../context/LanguageContext';

interface MosqueLocationPickerModalProps {
  initialLat: number; initialLng: number; address: string;
  onClose: () => void;
  onSuccess: (lat: number, lng: number, address: string) => void;
  onShowToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

// Default fallback coordinates (Dhaka, Bangladesh)
const DEFAULT_LAT = 23.8103;
const DEFAULT_LNG = 90.4125;

export const MosqueLocationPickerModal: React.FC<MosqueLocationPickerModalProps> = ({
  initialLat, initialLng, address,
  onClose,
  onSuccess,
  onShowToast
}) => {
  const { language } = useLanguage();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const initLat = initialLat !== 0 ? initialLat : DEFAULT_LAT;
  const initLng = initialLng !== 0 ? initialLng : DEFAULT_LNG;

  const [selectedLat, setSelectedLat] = useState<number>(initLat);
  const [selectedLng, setSelectedLng] = useState<number>(initLng);
  const [formattedAddress, setFormattedAddress] = useState<string>(address || '');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasPermissionError, setHasPermissionError] = useState<boolean>(false);

  // Custom modern Mosque Pin Icon using Leaflet DivIcon
  const createMosqueIcon = () => {
    return L.divIcon({
      className: 'custom-mosque-marker',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 36px; height: 36px; background: rgba(16, 185, 129, 0.3); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 38px; height: 38px; background: linear-gradient(135deg, #059669, #0d9488); border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 4px 14px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 18px;">
            🕌
          </div>
          <div style="position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #059669;"></div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 44],
      popupAnchor: [0, -44]
    });
  };

  // Reverse geocoding helper (OpenStreetMap Nominatim)
  const fetchAddressFromCoords = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': language === 'bn' ? 'bn, en' : 'en, bn' } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data && data.display_name) {
          setFormattedAddress(data.display_name);
        }
      }
    } catch (err) {
      console.warn('Reverse geocoding failed:', err);
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    try {
      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [initLat, initLng],
          zoom: (initialLat && initialLat !== 0) ? 16 : 13,
          zoomControl: false
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Clean OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        const marker = L.marker([initLat, initLng], {
          icon: createMosqueIcon(),
          draggable: true
        }).addTo(map);

        const popupText = language === 'bn' ? '<b>মসজিদ</b><br/>মসজিদের অবস্থান' : '<b>Mosque</b><br/>Mosque Location';
        marker.bindPopup(popupText).openPopup();

        // Drag event
        marker.on('dragend', (e: any) => {
          const position = e.target.getLatLng();
          setSelectedLat(position.lat);
          setSelectedLng(position.lng);
          fetchAddressFromCoords(position.lat, position.lng);
        });

        // Click on map to reposition marker
        map.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setSelectedLat(lat);
          setSelectedLng(lng);
          fetchAddressFromCoords(lat, lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;

        // Leaflet requires invalidateSize after modal animation
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 300);
      }
    } catch (err) {
      console.error('Leaflet initialization failed:', err);
      onShowToast(
        'error',
        language === 'bn' ? 'ম্যাপ ত্রুটি' : 'Map Error',
        language === 'bn' ? 'ম্যাপ লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।' : 'Failed to load map. Please try again.'
      );
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update marker position programmatically
  const updateMapPosition = (lat: number, lng: number, zoom = 16, autoAddress = true) => {
    setSelectedLat(lat);
    setSelectedLng(lng);

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.setView([lat, lng], zoom);
      markerRef.current.setLatLng([lat, lng]);
      markerRef.current.openPopup();
    }

    if (autoAddress) {
      fetchAddressFromCoords(lat, lng);
    }
  };

  // Use Current Device GPS Location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      onShowToast(
        'info',
        language === 'bn' ? 'লোকেশন অনুপলব্ধ' : 'Location Unavailable',
        language === 'bn' ? 'আপনার ডিভাইস বা ব্রাউজার GPS লোকেশন সমর্থন করে না।' : 'Your device or browser does not support GPS location.'
      );
      return;
    }

    setIsLocating(true);
    setHasPermissionError(false);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        updateMapPosition(latitude, longitude, 17, true);
        setIsLocating(false);
        onShowToast(
          'success',
          language === 'bn' ? 'বর্তমান লোকেশন চিহ্নিত' : 'Current Location Marked',
          language === 'bn' ? 'আপনার ডিভাইসের অবস্থান ম্যাপে পিন করা হয়েছে।' : 'Your device location has been pinned on the map.'
        );
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
        setHasPermissionError(true);
        onShowToast(
          'warning',
          language === 'bn' ? 'লোকেশন অনুমতি প্রয়োজন' : 'Location Permission Required',
          language === 'bn' ? 'GPS লোকেশন অনুমতি না পাওয়ায় অনুগ্রহ করে ম্যাপে ক্লিক করে বা ঠিকানা অনুসন্ধান করে নির্বাচন করুন।' : 'GPS permission not granted. Please click on map or search address.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Search Address / Places
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);

    try {
      const q = encodeURIComponent(searchQuery.trim() + ', Bangladesh');
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=5`,
        { headers: { 'Accept-Language': language === 'bn' ? 'bn, en' : 'en, bn' } }
      );

      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setSearchResults(data);
          // Automatically pick first result
          const first = data[0];
          const lat = parseFloat(first.lat);
          const lon = parseFloat(first.lon);
          updateMapPosition(lat, lon, 16, false);
          setFormattedAddress(first.display_name);
        } else {
          onShowToast(
            'info',
            language === 'bn' ? 'ফলাফল পাওয়া যায়নি' : 'No Results Found',
            language === 'bn' ? 'অনুসন্ধানকৃত ঠিকানার কোনো অবস্থান পাওয়া যায়নি। অন্য এলাকা লিখে চেষ্টা করুন।' : 'No location found matching your search. Please try a different area.'
          );
        }
      }
    } catch {
      onShowToast(
        'error',
        language === 'bn' ? 'অনুসন্ধান ত্রুটি' : 'Search Error',
        language === 'bn' ? 'ঠিকানা অনুসন্ধান করতে সমস্যা হয়েছে। ম্যাপে সরাসরি ক্লিক করুন।' : 'Failed to search address. Please click directly on the map.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (res: { display_name: string; lat: string; lon: string }) => {
    const lat = parseFloat(res.lat);
    const lon = parseFloat(res.lon);
    updateMapPosition(lat, lon, 17, false);
    setFormattedAddress(res.display_name);
    setSearchResults([]);
  };

  // Confirm and Save Location to DB
  const handleSaveLocation = () => {
    onSuccess(selectedLat, selectedLng, formattedAddress);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
              📍
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                {language === 'bn' ? 'মসজিদের লোকেশন সেট করুন' : 'Set Mosque Location'}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Google / OSM Maps
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'bn' ? 'মসজিদ • ম্যাপে সঠিক স্থানটি পিন করুন' : 'Mosque • Pin the exact location on map'}
              </p>
            </div>
          </div>

          <button
            id="close-location-picker-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Instructions and Controls */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="location-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'bn' ? 'এলাকা, বাজার বা ঠিকানা দিয়ে খুঁজুন (যেমন: ধানমন্ডি, মিরপুর)...' : 'Search by area, place or address (e.g. Dhanmondi, Mirpur)...'}
                className="w-full pl-10 pr-20 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                {isSearching ? <RotateCw className="w-3 h-3 animate-spin" /> : <span>{language === 'bn' ? 'খুঁজুন' : 'Search'}</span>}
              </button>
            </form>

            {/* Current Location Button */}
            <button
              id="use-current-location-btn"
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLocating}
              className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 hover:border-emerald-500/50 text-xs font-bold transition-all shrink-0 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
              <span>{isLocating ? (language === 'bn' ? 'শনাক্ত হচ্ছে...' : 'Locating...') : (language === 'bn' ? 'বর্তমান লোকেশন ব্যবহার করুন' : 'Use Current Location')}</span>
            </button>
          </div>

          {/* Search suggestions dropdown if any */}
          {searchResults.length > 0 && (
            <div className="p-2 rounded-2xl bg-slate-950 border border-slate-800 space-y-1 shadow-lg max-h-40 overflow-y-auto">
              <span className="text-[10px] font-bold text-slate-500 px-2 block">{language === 'bn' ? 'অনুসন্ধানের ফলাফল:' : 'Search Results:'}</span>
              {searchResults.map((res, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectSearchResult(res)}
                  className="w-full text-left p-2 rounded-xl hover:bg-slate-800/80 text-xs text-slate-300 hover:text-white flex items-start gap-2 transition-colors cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-1">{res.display_name}</span>
                </button>
              ))}
            </div>
          )}

          {hasPermissionError && (
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {language === 'bn'
                  ? 'ডিভাইস লোকেশন পাওয়া যায়নি। আপনি নিচের ম্যাপে যে কোনো জায়গায় ক্লিক করে অথবা মার্কারটি টেনে সঠিক স্থান নির্ধারণ করতে পারেন।'
                  : 'Device location not found. You can click anywhere on the map below or drag the marker to set the exact location.'}
              </span>
            </div>
          )}

          {/* Interactive Map Container */}
          <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-700 shadow-inner bg-slate-950">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Map Floating Tip Badge */}
            <div className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 text-[11px] text-slate-200 shadow-md flex items-center gap-1.5 pointer-events-none">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>{language === 'bn' ? 'মার্কার টেনে সঠিক স্থানে রাখুন বা ম্যাপে ক্লিক করুন' : 'Drag marker to exact spot or click on map'}</span>
            </div>
          </div>

          {/* Selected Location Summary Panel */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                {language === 'bn' ? 'নির্বাচিত কোঅর্ডিনেট:' : 'Selected Coordinates:'}
              </span>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-emerald-400 border border-slate-800">
                  Lat: {selectedLat.toFixed(6)}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-teal-400 border border-slate-800">
                  Lng: {selectedLng.toFixed(6)}
                </span>
              </div>
            </div>

            {/* Formatted Address Field */}
            <div className="pt-2 border-t border-slate-800/80 space-y-1">
              <label className="text-[11px] text-slate-400 block font-medium">
                {language === 'bn' ? 'মসজিদের ঠিকানা / ল্যান্ডমার্ক বিবরণ:' : 'Mosque Address / Landmark Description:'}
              </label>
              <input
                type="text"
                value={formattedAddress}
                onChange={(e) => setFormattedAddress(e.target.value)}
                placeholder={language === 'bn' ? 'মসজিদের বিস্তারিত ঠিকানা বা ল্যান্ডমার্ক...' : 'Detailed mosque address or landmarks...'}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
          >
            {language === 'bn' ? 'বাতিল' : 'Cancel'}
          </button>

          <button
            id="confirm-save-location-btn"
            type="button"
            onClick={handleSaveLocation}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-extrabold shadow-lg shadow-emerald-900/30 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>{language === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...'}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>{language === 'bn' ? 'লোকেশন নিশ্চিত ও সংরক্ষণ করুন' : 'Confirm & Save Location'}</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

