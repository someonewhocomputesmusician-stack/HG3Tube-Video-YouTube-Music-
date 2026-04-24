/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  ArrowLeft,
  Music, 
  Upload, 
  Search, 
  User as UserIcon, 
  Library, 
  Flame, 
  Settings, 
  LogOut,
  Maximize2,
  Video,
  DollarSign,
  Share2,
  MoreVertical,
  PlusCircle,
  Menu,
  X,
  Key,
  Copy,
  Trash2,
  ExternalLink,
  Code2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './AuthContext';
import { 
  auth, 
  googleProvider, 
  getPublicContent, 
  uploadContent, 
  ContentItem,
  generateApiKey,
  getUserApiKeys,
  deleteApiKey,
  updateApiKeyUris,
  createChannel,
  getChannelByOwner,
  generateAuthToken,
  generateUploadUri,
  Channel
} from './lib/firebase';
import { signInWithPopup, signOut } from 'firebase/auth';
import { generateContentMetadata } from './lib/gemini';

// --- Components ---

const Navbar = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => signOut(auth);

  return (
    <nav className="fixed top-0 w-full h-20 bg-[#050505] border-b border-[#E4E3E0]/10 px-8 flex items-center justify-between z-50">
      <div className="flex items-center gap-12">
        <h1 className="text-3xl font-black tracking-tighter italic text-[#E4E3E0]">HG3 TUBE</h1>
        <div className="hidden lg:flex gap-8 text-[11px] uppercase tracking-[0.2em] font-medium text-[#E4E3E0]">
          <button className="text-white border-b border-white pb-1">Network</button>
          <button className="opacity-40 hover:opacity-100 transition-opacity">Distribution</button>
          <button className="opacity-40 hover:opacity-100 transition-opacity">Analytics</button>
        </div>
      </div>

      <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
        <input 
          type="text"
          placeholder="SEARCH THE ARCHIVE"
          className="w-full bg-transparent border-b border-[#E4E3E0]/20 py-1 text-[11px] tracking-widest focus:outline-none focus:border-white transition-colors text-[#E4E3E0]"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search className="absolute right-0 top-1.5 w-3 h-3 text-white/40" />
      </div>

      <div className="flex items-center gap-6">
        {user ? (
          <>
            <button className="text-[11px] uppercase tracking-widest font-bold text-[#E4E3E0]/60 hover:text-white transition-colors">
              Studio
            </button>
            <div className="flex items-center gap-3">
              <img src={user.photoURL || ''} alt="Avatar" className="w-8 h-8 rounded-full border border-[#E4E3E0]/20" />
              <button onClick={logout} className="p-2 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <button 
            onClick={login}
            className="bg-[#E4E3E0] text-black text-[11px] uppercase tracking-[0.3em] font-black px-6 py-3 hover:bg-white transition-colors"
          >
            Authenticate
          </button>
        )}
      </div>
    </nav>
  );
};

const SidebarItem = ({ icon: Icon, label, active = false, onClick }: { icon: any, label: string, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-4 py-3 border-l-2 transition-all group ${active ? 'border-orange-500 bg-[#111] text-white' : 'border-transparent text-white/40 hover:text-white hover:bg-white/5'}`}
  >
    <Icon className={`w-4 h-4 ${active ? 'text-orange-500' : ''}`} />
    <span className="font-serif italic text-sm">{label}</span>
  </button>
);

const VideoPlayer = ({ item, onBack }: { item: ContentItem, onBack: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) videoRef.current.volume = val;
    setIsMuted(val === 0);
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const p = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(p);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3 h-3" />
        Return to Archive
      </button>

      <div className="relative aspect-video bg-black group overflow-hidden border border-white/10">
        <video 
          ref={videoRef}
          src={item.url}
          className="w-full h-full cursor-pointer"
          onTimeUpdate={handleTimeUpdate}
          onClick={togglePlay}
          playsInline
        />
        
        {/* Controls Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-6">
          <div className="flex flex-col gap-4">
            {/* Progress Bar */}
            <div className="w-full h-1 bg-white/20 relative group/progress cursor-pointer">
              <div className="h-full bg-orange-500 transition-all duration-100" style={{ width: `${progress}%` }} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <button onClick={togglePlay} className="text-white hover:text-orange-500 transition-colors">
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>
                
                <div className="flex items-center gap-3">
                  <button onClick={() => setIsMuted(!isMuted)}>
                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input 
                    type="range" min="0" max="1" step="0.1" 
                    value={isMuted ? 0 : volume} 
                    onChange={handleVolumeChange}
                    className="w-20 accent-orange-500 cursor-pointer h-1 rounded-full appearance-none bg-white/20"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono text-white/60 uppercase tracking-widest">HG3_NODE_STREAM_V4</span>
                <button onClick={toggleFullscreen} className="text-white hover:text-orange-500 transition-colors">
                  <Maximize className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-12">
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] uppercase tracking-[0.4em] text-orange-500 font-bold mb-2 block">
                {item.type === 'music' ? 'Audio Master' : 'Visual Record'}
              </span>
              <h1 className="text-5xl font-black italic tracking-tighter uppercase transform -skew-x-3">{item.title}</h1>
            </div>
            <div className="flex items-center gap-4">
               <button className="p-3 bg-white/5 hover:bg-white text-white/60 hover:text-black transition-all">
                  <Share2 className="w-4 h-4" />
               </button>
               <button className="p-3 bg-white/5 hover:bg-white text-white/60 hover:text-black transition-all">
                  <PlusCircle className="w-4 h-4" />
               </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-4 border border-[#E4E3E0]/10 bg-[#111]">
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.authorId}`} 
              alt="Avatar" 
              className="w-12 h-12 bg-white/5" 
            />
            <div className="flex-1">
              <h4 className="text-sm font-serif italic">{item.authorName}</h4>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Verified Distribution Node</p>
            </div>
            <button className="bg-white text-black px-6 py-2 text-[10px] font-black uppercase tracking-widest">Subscribe</button>
          </div>

          <div className="font-serif italic text-lg leading-relaxed text-white/60">
            {item.description || "No metadata synchronization for this node yet. Unlimited distribution active."}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-[10px] uppercase tracking-[0.4em] font-bold text-white/40">Technical Specs</h3>
          <div className="space-y-3">
            {[
              { label: 'Codec', value: 'AV1_HG3' },
              { label: 'Bitrate', value: '42.8 Mbps' },
              { label: 'Integrity', value: '100% SHA-256' },
              { label: 'Distribution', value: 'Global Node 09' }
            ].map(spec => (
              <div key={spec.label} className="flex justify-between items-end border-b border-white/5 pb-2">
                <span className="text-[9px] uppercase tracking-widest text-white/20">{spec.label}</span>
                <span className="text-xs font-mono text-white/60">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const VideoCard = ({ item, onClick }: { item: ContentItem, onClick: () => void }) => {
  const isMusic = item.type === 'music';
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      className="group cursor-pointer bg-[#111] border border-[#E4E3E0]/5 p-4 hover:bg-white transition-all duration-300"
    >
      <div className="relative aspect-video overflow-hidden">
        <img 
          src={item.thumbnailUrl || `https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=800`} 
          alt={item.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 grayscale group-hover:grayscale-0"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/0 transition-colors" />
        <div className="absolute bottom-2 right-2 text-[8px] bg-black text-white px-2 py-0.5 font-mono">
          {item.type === 'music' ? 'AUDIO' : 'VIDEO'}
        </div>
      </div>
      <div className="mt-4 flex flex-col h-full" onClick={onClick}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-tighter text-[#E4E3E0]/40 group-hover:text-black/40">
            {item.authorName}
          </span>
          <span className="text-[9px] font-serif italic text-[#E4E3E0]/30 group-hover:text-black/30">
            Vol. 24
          </span>
        </div>
        <h3 className="text-xl font-serif italic text-[#E4E3E0] group-hover:text-black leading-tight line-clamp-1">
          {item.title}
        </h3>
        <div className="mt-auto pt-4 flex items-center justify-between border-t border-[#E4E3E0]/10 group-hover:border-black/10">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[9px] uppercase tracking-widest text-[#E4E3E0]/40 group-hover:text-black/40">Synced</span>
          </div>
          <p className="text-[9px] font-mono text-[#E4E3E0]/30 group-hover:text-black/30">
            {isMusic ? 'MUSIC-NODE-01' : 'TUBE-CORE-V2'}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

const UploadModal = ({ isOpen, onClose, channel, onAcknowledge }: { isOpen: boolean, onClose: () => void, channel: Channel | null, onAcknowledge: () => void }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'video' as 'video' | 'music' | 'show' | 'film',
    visibility: 'public' as 'public' | 'private',
    monetizationEnabled: true
  });
  const [aiMetadata, setAiMetadata] = useState<any>(null);

  if (!channel && isOpen) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-md bg-[#0a0a0a] border border-orange-500/30 p-10 text-center shadow-2xl">
            <h2 className="text-2xl font-black italic uppercase mb-4 text-[#E4E3E0]">Channel Required</h2>
            <p className="text-white/40 mb-8 font-serif italic text-sm">Establish your distribution node before performing media ingestion. Redirecting to initialization required.</p>
            <button 
              onClick={() => {
                onClose();
                onAcknowledge();
              }} 
              className="bg-orange-500 text-black px-8 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-orange-400 transition-colors"
            >
              Acknowledge
            </button>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    
    // In a real app, you'd upload a file to Firebase Storage here.
    // For this demo, we'll use a placeholder URL.
    const newItem: ContentItem = {
      title: formData.title,
      description: formData.description,
      url: 'https://storage.example.com/demo.mp4',
      thumbnailUrl: formData.type === 'music' 
        ? 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=800'
        : 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&q=80&w=800',
      type: formData.type,
      visibility: formData.visibility,
      authorId: user.uid,
      authorName: user.displayName || 'Anonymous',
      metadata: aiMetadata,
      monetization: {
        enabled: formData.monetizationEnabled,
        type: 'revenue_share',
        currency: 'USD'
      }
    };

    try {
      await uploadContent(newItem);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const enrichWithAI = async () => {
    if (!formData.title) return;
    setLoading(true);
    const meta = await generateContentMetadata(formData.title, formData.description, formData.type);
    if (meta) {
      setAiMetadata(meta);
      setFormData(prev => ({
        ...prev,
        description: meta.marketingDescription || prev.description
      }));
    }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="relative w-full max-w-xl bg-[#0a0a0a] border border-[#E4E3E0]/10 overflow-hidden shadow-2xl h-screen md:h-auto"
          >
            <div className="p-8 border-b border-[#E4E3E0]/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 block mb-1">Queue Management</span>
                <h2 className="text-2xl italic font-serif flex items-center gap-3">
                  Media Ingestion
                </h2>
              </div>
              <button onClick={onClose} className="p-3 hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="p-8 space-y-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <button 
                  type="button"
                  onClick={() => setFormData(prev => ({...prev, type: 'video'}))}
                  className={`p-4 border transition-all flex flex-col items-center justify-center gap-3 ${formData.type === 'video' ? 'bg-white text-black border-white' : 'bg-transparent border-[#E4E3E0]/10 text-white/40 hover:text-white'}`}
                >
                  <Video className="w-6 h-6" />
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase">Video</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData(prev => ({...prev, type: 'music'}))}
                  className={`p-4 border transition-all flex flex-col items-center justify-center gap-3 ${formData.type === 'music' ? 'bg-white text-black border-white' : 'bg-transparent border-[#E4E3E0]/10 text-white/40 hover:text-white'}`}
                >
                  <Music className="w-6 h-6" />
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase">Music</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData(prev => ({...prev, type: 'show'}))}
                  className={`p-4 border transition-all flex flex-col items-center justify-center gap-3 ${formData.type === 'show' ? 'bg-white text-black border-white' : 'bg-transparent border-[#E4E3E0]/10 text-white/40 hover:text-white'}`}
                >
                  <Play className="w-6 h-6" />
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase">TV_Show</span>
                </button>
                <button 
                  type="button"
                  onClick={() => setFormData(prev => ({...prev, type: 'film'}))}
                  className={`p-4 border transition-all flex flex-col items-center justify-center gap-3 ${formData.type === 'film' ? 'bg-white text-black border-white' : 'bg-transparent border-[#E4E3E0]/10 text-white/40 hover:text-white'}`}
                >
                  <Maximize2 className="w-6 h-6" />
                  <span className="text-[10px] font-black tracking-[0.2em] uppercase">Movie</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E4E3E0]/30 underline decoration-orange-500/30 underline-offset-4">Metadata Title</label>
                  <input 
                    required
                    type="text" 
                    value={formData.title}
                    onChange={e => setFormData(p => ({...p, title: e.target.value}))}
                    className="w-full bg-transparent border-b border-[#E4E3E0]/20 py-3 text-lg font-serif italic focus:outline-none focus:border-white text-[#E4E3E0] placeholder:text-white/10"
                    placeholder="UNTITLED_MEDIA_PROJECT"
                  />
                </div>

                <div className="pt-4 border-t border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E4E3E0]">Monetization Engine</h4>
                      <p className="text-[9px] text-white/30 uppercase mt-1">Enable revenue sharing for this node</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setFormData(p => ({...p, monetizationEnabled: !p.monetizationEnabled}))}
                      className={`w-12 h-6 rounded-full transition-all relative ${formData.monetizationEnabled ? 'bg-orange-500' : 'bg-white/10'}`}
                    >
                      <motion.div 
                        animate={{ x: formData.monetizationEnabled ? 24 : 4 }}
                        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-xl"
                      />
                    </button>
                  </div>

                  {formData.monetizationEnabled && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-orange-500/5 border border-orange-500/20"
                    >
                      <div className="flex items-center gap-3 text-orange-500">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Revenue_Share: Active (70/30)</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E4E3E0]/30">Narrative Description</label>
                    <button 
                      type="button"
                      onClick={enrichWithAI}
                      disabled={!formData.title || loading}
                      className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 hover:text-orange-400 disabled:opacity-50"
                    >
                      AI_SYNC_*
                    </button>
                  </div>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData(p => ({...p, description: e.target.value}))}
                    rows={4}
                    className="w-full bg-[#111] border border-[#E4E3E0]/10 p-4 text-xs font-medium focus:outline-none focus:border-white text-white/70 resize-none leading-relaxed"
                    placeholder="Enter track or video metadata..."
                  />
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                   <select 
                    className="bg-transparent text-[10px] font-black uppercase tracking-[0.2em] text-white/60 focus:outline-none border-b border-white/20 pb-1"
                    value={formData.visibility}
                    onChange={e => setFormData(p => ({...p, visibility: e.target.value as 'public' | 'private'}))}
                  >
                    <option value="public" className="bg-black">PUBLIC_ACCESS</option>
                    <option value="private" className="bg-black">PRIVATE_ENCRYPTED</option>
                  </select>
                  <span className="text-[9px] uppercase tracking-widest text-white/20">Monetization: ENABLED</span>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#E4E3E0] text-black py-5 text-[11px] uppercase tracking-[0.5em] font-black hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center gap-4"
                >
                  {loading ? 'INGESTING...' : 'INITIALIZE_PUBLISH'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const ChannelSetup = ({ onComplete }: { onComplete: () => void }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'general' as any,
    description: '',
    avatarUrl: ''
  });

  useEffect(() => {
    if (user) {
      setFormData(p => ({ ...p, name: user.displayName || '', avatarUrl: user.photoURL || '' }));
    }
  }, [user]);

  const connectGoogle = async () => {
    setLoading(true);
    // Mimic YouTube-style account linking delay
    await new Promise(r => setTimeout(r, 1200));
    setIsGoogleConnected(true);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isGoogleConnected) return;
    setLoading(true);
    await createChannel({
      id: Math.random().toString(36).substring(2),
      ownerId: user.uid,
      ...formData
    });
    setLoading(false);
    onComplete();
  };

  return (
    <div className="max-w-2xl mx-auto py-20 px-8 bg-[#0a0a0a] border border-[#E4E3E0]/10">
      <header className="mb-12">
        <span className="text-[10px] uppercase tracking-[0.4em] text-orange-500 font-bold mb-2 block">Identity Initialization</span>
        <h2 className="text-4xl font-black italic tracking-tighter uppercase transform -skew-x-3">Establish Channel Node</h2>
        <p className="mt-4 text-white/40 font-serif italic text-lg">You must establish a distribution channel and verify your identity before syncing media.</p>
      </header>

      <div className="mb-10 p-6 bg-white/5 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer h-16 w-16">
            <img src={formData.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Channel'} alt="Avatar" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Upload className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest">Channel Avatar</h4>
            <p className="text-[10px] text-white/30 uppercase mt-1">400x400 PNG/JPG RECOMMENDED</p>
          </div>
        </div>
        {!isGoogleConnected ? (
          <button 
            type="button"
            onClick={connectGoogle}
            className="flex items-center gap-2 bg-white text-black px-4 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-white/90"
          >
            <Play fill="black" className="w-3 h-3" /> Connect Google Account
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 px-3 py-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Verified Identity</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E4E3E0]/30">Channel Name</label>
            <input 
              required
              type="text" 
              className="w-full bg-transparent border-b border-[#E4E3E0]/20 py-3 text-lg font-serif italic focus:outline-none focus:border-white text-[#E4E3E0]"
              value={formData.name}
              onChange={e => setFormData(p => ({...p, name: e.target.value}))}
              placeholder="e.g. Sonic Archives"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E4E3E0]/30">Avatar URL</label>
            <input 
              type="text" 
              className="w-full bg-transparent border-b border-[#E4E3E0]/20 py-3 text-xs focus:outline-none focus:border-white text-white/60"
              value={formData.avatarUrl}
              onChange={e => setFormData(p => ({...p, avatarUrl: e.target.value}))}
              placeholder="https://example.com/avatar.png"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E4E3E0]/30">Distribution Domain</label>
            <select 
              className="w-full bg-transparent border-b border-[#E4E3E0]/20 py-3 text-sm focus:outline-none focus:border-white text-white/60"
              value={formData.type}
              onChange={e => setFormData(p => ({...p, type: e.target.value as any}))}
            >
              <option value="general" className="bg-black">General Archive</option>
              <option value="music" className="bg-black">Music Distribution</option>
              <option value="gaming" className="bg-black">Gaming Network</option>
              <option value="show" className="bg-black">Original Shows</option>
              <option value="film" className="bg-black">Film Repository</option>
              <option value="vlog" className="bg-black">Vlog Identity</option>
              <option value="tech" className="bg-black">Technical Logs</option>
              <option value="education" className="bg-black">Educational Node</option>
              <option value="news" className="bg-black">Global News</option>
              <option value="sports" className="bg-black">Atheletic Archive</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#E4E3E0]/30">Node Description</label>
            <textarea 
              className="w-full bg-[#111] border border-[#E4E3E0]/10 p-4 text-xs font-medium focus:outline-none focus:border-white text-white/70 resize-none h-32"
              value={formData.description}
              onChange={e => setFormData(p => ({...p, description: e.target.value}))}
              placeholder="Describe your content strategy..."
            />
          </div>
        </div>

        <button 
          type="submit"
          disabled={loading || !isGoogleConnected}
          className="w-full bg-[#E4E3E0] text-black py-5 text-[11px] uppercase tracking-[0.5em] font-black hover:bg-white transition-all disabled:opacity-20"
        >
          {!isGoogleConnected ? 'AWAITING_GOOGLE_SYNC' : (loading ? 'SYNCING_IDENTITY...' : 'INITIALIZE_CHANNEL')}
        </button>
      </form>
    </div>
  );
};

const UriGenerator = ({ channelId }: { channelId: string }) => {
  const [loading, setLoading] = useState(false);
  const [generatedUri, setGeneratedUri] = useState('');
  const [type, setType] = useState('music');

  const generate = async () => {
    setLoading(true);
    const uri = await generateUploadUri(channelId, type);
    setGeneratedUri(uri);
    setLoading(false);
  };

  return (
    <div className="bg-[#111] border border-[#E4E3E0]/10 p-10 space-y-8">
      <header>
        <span className="text-[10px] uppercase tracking-[0.4em] text-orange-500 font-bold mb-2 block">Upload Gateway</span>
        <h3 className="text-2xl font-black italic tracking-tighter uppercase transform -skew-x-3">URI Generator</h3>
      </header>

      <div className="flex gap-4">
        <select 
          className="bg-black border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white/60 focus:outline-none"
          value={type}
          onChange={e => setType(e.target.value)}
        >
          <option value="music">MUSIC_NODE</option>
          <option value="video">VIDEO_NODE</option>
        </select>
        <button 
          onClick={generate}
          disabled={loading}
          className="flex-1 bg-[#E4E3E0] text-black py-3 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white transition-all"
        >
          {loading ? 'GENERATING...' : 'GENERATE_SECURE_URI'}
        </button>
      </div>

      {generatedUri && (
        <div className="space-y-2">
          <p className="text-[9px] uppercase tracking-widest text-white/20">Secured Entry Point URI</p>
          <div className="flex items-center gap-2">
            <code className="bg-black px-4 py-3 border border-white/5 text-[10px] text-orange-500 flex-1 truncate font-mono">
              {generatedUri}
            </code>
            <button 
              onClick={() => navigator.clipboard.writeText(generatedUri)}
              className="p-3 bg-white/5 hover:bg-white text-white/60 hover:text-black transition-all"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ApiManagement = () => {
  const { user } = useAuth();
  const [keys, setKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [uriInput, setUriInput] = useState('');
  const [isTokenLoading, setIsTokenLoading] = useState(false);
  const [tokens, setTokens] = useState<any>(null);

  const handleRefreshToken = async (clientId: string) => {
    if (!user) return;
    setIsTokenLoading(true);
    // AI simulation: Refreshing tokens using Gemini-like logic (simulated)
    const newTokens = await generateAuthToken(user.uid, clientId);
    setTokens(newTokens);
    setIsTokenLoading(false);
  };

  useEffect(() => {
    if (user) {
      getUserApiKeys(user.uid).then(res => res && setKeys(res));
    }
  }, [user]);

  const handleGenerate = async () => {
    if (!user) return;
    setLoading(true);
    const newKey = await generateApiKey(user.uid);
    if (newKey) {
      const updated = await getUserApiKeys(user.uid);
      if (updated) setKeys(updated);
    }
    setLoading(false);
  };

  const handleDelete = async (key: string) => {
    await deleteApiKey(key);
    const updated = await getUserApiKeys(user?.uid || '');
    if (updated) setKeys(updated);
  };

  const handleAddUri = async (key: string) => {
    if (!uriInput) return;
    const k = keys.find(x => x.key === key);
    if (!k) return;
    const newUris = [...(k.redirectUris || []), uriInput];
    await updateApiKeyUris(key, newUris);
    const updated = await getUserApiKeys(user?.uid || '');
    if (updated) setKeys(updated);
    setUriInput('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-12">
      <div className="bg-[#080808] border border-[#E4E3E0]/10 p-12 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-6 mb-8">
            <div className="bg-orange-500 p-3">
              <Code2 className="w-8 h-8 text-black" />
            </div>
            <h2 className="text-4xl font-black italic tracking-tighter uppercase transform -skew-x-3 italic">Developer Credentials</h2>
          </div>
          <p className="font-serif italic text-lg text-white/60 max-w-2xl mb-10 leading-relaxed">
            Manage Client IDs and Secrets for Android, Desktop, and Laptop distribution apps. Configure OAuth redirect URIs for secure ingestion.
          </p>
          <button 
            onClick={handleGenerate}
            disabled={loading || keys.length >= 3}
            className="bg-[#E4E3E0] text-black px-10 py-5 text-[11px] uppercase tracking-[0.4em] font-black hover:bg-white transition-all disabled:opacity-30"
          >
            {loading ? 'GENERATING_NODE...' : 'CREATE_CLIENT_CREDENTIALS'}
          </button>
        </div>
        <Key className="absolute -bottom-16 -right-16 w-64 h-64 text-white/5 -rotate-45" />
      </div>

      <div className="space-y-8">
        <h3 className="text-[10px] uppercase tracking-[0.4em] font-bold text-orange-500">Active Distribution Gates</h3>
        <div className="grid gap-6">
          {keys.map((k) => (
            <div key={k.key} className="bg-[#111] border border-[#E4E3E0]/10 p-8 space-y-6 group hover:border-white transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-4 flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-widest text-white/30">Client ID (Android/Web)</p>
                      <div className="flex items-center gap-2">
                        <code className="bg-black px-3 py-1.5 border border-white/5 text-[11px] text-orange-500 flex-1">{k.clientId}</code>
                        <button onClick={() => copyToClipboard(k.clientId)} className="p-2 hover:bg-white/10 transition-colors"><Copy className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-widest text-white/30">Client Secret (Desktop/Laptop)</p>
                      <div className="flex items-center gap-2">
                        <code className="bg-black px-3 py-1.5 border border-white/5 text-[11px] text-orange-500 flex-1">{k.clientSecret}</code>
                        <button onClick={() => copyToClipboard(k.clientSecret)} className="p-2 hover:bg-white/10 transition-colors"><Copy className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[9px] uppercase tracking-widest text-white/30">Active Auth Tokens (AI Regenerated)</p>
                        <button 
                          onClick={() => handleRefreshToken(k.clientId)}
                          disabled={isTokenLoading}
                          className="text-[9px] font-black uppercase text-orange-500 hover:text-orange-400"
                        >
                          {isTokenLoading ? 'SYNCING...' : 'RE-SYNC_AI_TOKENS'}
                        </button>
                      </div>
                      {tokens && tokens.clientId === k.clientId && (
                        <div className="bg-black/40 p-4 border border-white/5 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] uppercase tracking-widest text-white/20">Access Token</span>
                            <code className="text-[10px] text-orange-400 font-mono">{tokens.accessToken}</code>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] uppercase tracking-widest text-white/20">Refresh Token</span>
                            <code className="text-[10px] text-orange-400 font-mono">{tokens.refreshToken}</code>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-white/30">API Key (Legacy)</p>
                    <div className="flex items-center gap-2">
                      <code className="bg-black px-3 py-1.5 border border-white/5 text-[11px] text-white/60 flex-1">{k.key}</code>
                      <button onClick={() => copyToClipboard(k.key)} className="p-2 hover:bg-white/10 transition-colors"><Copy className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <button 
                    onClick={() => handleDelete(k.key)}
                    className="p-3 bg-white/5 hover:bg-red-600 transition-all text-white/60 hover:text-white"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[10px] uppercase tracking-widest font-black text-white/60">Authorized Redirect URIs</h4>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="https://yourapp.com/callback"
                      className="bg-black border border-white/10 px-3 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-orange-500"
                      value={uriInput}
                      onChange={e => setUriInput(e.target.value)}
                    />
                    <button 
                      onClick={() => handleAddUri(k.key)}
                      className="bg-orange-500 text-black px-3 py-1 text-[9px] font-black uppercase tracking-widest"
                    >Add</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(k.redirectUris || []).map((uri: string) => (
                    <div key={uri} className="bg-white/5 px-3 py-1 text-[9px] font-mono border border-white/10 flex items-center gap-2">
                      {uri}
                      <button className="text-white/20 hover:text-red-500">×</button>
                    </div>
                  ))}
                  {(k.redirectUris || []).length === 0 && <span className="text-[9px] text-white/20 italic">No URIs configured</span>}
                </div>
              </div>
            </div>
          ))}

          {keys.length === 0 && (
            <div className="py-32 border-2 border-dashed border-[#E4E3E0]/5 text-center">
              <span className="text-[10px] uppercase tracking-[0.5em] text-white/20">NO_ACTIVE_PIPELINES</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#111] p-10 border-l-4 border-orange-500">
        <h4 className="text-[10px] uppercase tracking-[0.4em] font-black text-[#E4E3E0] mb-6">Device Distribution Spec</h4>
        <pre className="bg-black p-8 text-xs font-mono text-orange-500/80 overflow-x-auto leading-relaxed border border-white/5">
{`// App-Side Configuration (Android/Desktop)
const client = hg3.initialize({
  clientId: '${keys[0]?.clientId || 'CLIENT_ID'}',
  clientSecret: '${keys[0]?.clientSecret || 'CLIENT_SECRET'}', // ONLY for trusted hardware
  env: 'streaming_distribution_v2.4'
});`}
        </pre>
      </div>
    </div>
  );
};

const StreamingDistribution = () => {
  const { user } = useAuth();
  
  const platforms = [
    { name: 'Spotify', status: 'Connected', icon: 'S' },
    { name: 'Apple Music', status: 'Awaiting Metadata', icon: 'A' },
    { name: 'YouTube Music', status: 'Active', icon: 'Y' },
    { name: 'Tidal', status: 'HIFI Enabled', icon: 'T' }
  ];

  return (
    <div className="space-y-12">
      <header className="flex items-center justify-between border-b border-white/10 pb-8">
        <div>
          <span className="text-[10px] uppercase tracking-[0.4em] text-orange-500 font-bold mb-2 block">Global Logistics</span>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase transform -skew-x-3">Streaming Distribution</h2>
        </div>
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-white/30">Node Health</p>
            <p className="text-xs font-mono text-green-500">OPTIMAL_SYNC</p>
          </div>
        </div>
      </header>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/40">Active Sync Pipelines</h3>
          <div className="grid gap-4">
            {platforms.map(p => (
              <div key={p.name} className="bg-[#111] border border-white/5 p-6 flex items-center justify-between group hover:border-white/20 transition-all">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center font-black text-xl italic group-hover:bg-white group-hover:text-black transition-all">
                    {p.icon}
                  </div>
                  <div>
                    <h4 className="font-serif italic text-lg">{p.name}</h4>
                    <p className="text-[10px] uppercase tracking-widest text-white/30">{p.status}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-mono text-white/20">v2.4_SDK_SYNC</span>
                  <div className="mt-1 flex items-center justify-end gap-1">
                    <div className="w-1 h-1 rounded-full bg-green-500"></div>
                    <div className="w-1 h-1 rounded-full bg-green-500"></div>
                    <div className="w-1 h-1 rounded-full bg-white/20"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/40">Artwork Integrity</h3>
          <div className="bg-[#080808] border border-white/5 p-6">
            <div className="aspect-square bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center mb-4 group cursor-pointer hover:border-white/40">
              <Upload className="w-8 h-8 text-white/20 mb-2 group-hover:text-white" />
              <span className="text-[9px] uppercase tracking-widest text-white/20 group-hover:text-white">Batch Upload Artwork</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[8px] uppercase tracking-widest text-white/40">
                <span>Verification Queue</span>
                <span>4 items</span>
              </div>
              <div className="h-1 bg-white/10 overflow-hidden">
                <div className="h-full bg-orange-500 w-2/3"></div>
              </div>
            </div>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/20 p-6">
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-2">Monetization Engine</h4>
            <p className="text-[10px] leading-relaxed text-white/60 mb-4">
              Revenue from Streaming Distribution APIs is consolidated into your HG3 Global Wallet. Syncing verified.
            </p>
            <button className="text-[9px] font-bold uppercase tracking-widest underline decoration-white/20 hover:decoration-white transition-all">
              Withdraw Funds
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Pages ---
const Dashboard = () => {
  const { user } = useAuth();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'music' | 'videos' | 'api' | 'streaming'>('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isCheckingChannel, setIsCheckingChannel] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const results = await getPublicContent();
      if (results) setContent(results);
      
      if (user) {
        const c = await getChannelByOwner(user.uid);
        setChannel(c);
      }
      setIsCheckingChannel(false);
    };
    fetch();
  }, [user]);

  const handleUploadClick = () => {
    if (!channel) {
      // In a real app we might redirect or show a prompt. 
      // Here we will force the tab to something else if they don't have a channel?
      // No, let's just use the logic in the return to show channel setup.
    }
    setIsUploadOpen(true);
  };

  const filteredContent = content.filter(item => {
    if (activeTab === 'all' || activeTab === 'api' || activeTab === 'streaming') return true;
    return activeTab === 'music' ? item.type === 'music' : item.type === 'video';
  });

  if (user && !channel && !isCheckingChannel && activeTab !== 'all') {
    return (
      <div className="min-h-screen bg-[#050505] text-[#E4E3E0]">
        <Navbar />
        <main className="pt-32 px-8 max-w-4xl mx-auto">
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-2">Sync Required</h1>
            <p className="text-white/40 font-serif italic text-lg">Your account is not yet connected to a distribution channel. Create one to start uploading.</p>
          </div>
          <ChannelSetup onComplete={() => getChannelByOwner(user.uid).then((c) => {
            setChannel(c);
            // Optional: Automatically open upload modal or guide user
          })} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#E4E3E0] font-sans selection:bg-orange-500 selection:text-white overflow-x-hidden">
      <Navbar />
      
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-20 w-72 h-[calc(100vh-80px)] p-8 border-r border-[#E4E3E0]/10 space-y-1">
        <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold mb-6 text-white/40">Archive Index</h3>
        <SidebarItem icon={Flame} label="Featured Network" active={activeTab === 'all'} onClick={() => { setActiveTab('all'); setSelectedContent(null); }} />
        <SidebarItem icon={Music} label="Music Distribution" active={activeTab === 'streaming'} onClick={() => { setActiveTab('streaming'); setSelectedContent(null); }} />
        <SidebarItem icon={Library} label="Channel Node" active={activeTab === 'music'} onClick={() => { setActiveTab('music'); setSelectedContent(null); }} />
        <SidebarItem icon={Video} label="Video Repository" active={activeTab === 'videos'} onClick={() => { setActiveTab('videos'); setSelectedContent(null); }} />
        
        <div className="my-10 border-t border-[#E4E3E0]/10" />
        
        <h3 className="text-[10px] uppercase tracking-[0.3em] font-bold mb-6 text-white/40">Lab Management</h3>
        <SidebarItem icon={DollarSign} label="Monetization" />
        <SidebarItem 
          icon={Code2} 
          label="API Endpoints" 
          active={activeTab === 'api'} 
          onClick={() => { setActiveTab('api'); setSelectedContent(null); }}
        />
        
        {user && activeTab !== 'api' && activeTab !== 'streaming' && !selectedContent && (
          <div className="mt-auto p-6 bg-[#111] border border-[#E4E3E0]/5 group relative overflow-hidden">
            <div className="relative z-10">
              <span className="text-[10px] uppercase tracking-widest text-[#E4E3E0]/40 block mb-2 underline decoration-orange-500/50 underline-offset-4">Distribution Tier</span>
              <h4 className="font-serif italic text-lg leading-tight mb-4">Unlimited Media Pipeline</h4>
              <button className="w-full bg-[#E4E3E0] text-black text-[9px] uppercase tracking-[0.3em] font-black py-3 hover:bg-white transition-colors">
                PRO-SYNC
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Content Area */}
      <main className="lg:ml-72 pt-32 px-8 pb-20 max-w-[1600px] mx-auto">
        {!selectedContent && (
          <header className="mb-16">
            <div className="flex justify-between items-start mb-8">
              <span className="text-[10px] uppercase tracking-[0.3em] px-4 py-1.5 border border-[#E4E3E0]/20 rounded-full text-orange-500 font-bold border-orange-500/20">
                HG3 ENGINE ACTIVE
              </span>
              <span className="font-serif italic text-sm opacity-40">System Core v2.4</span>
            </div>
            
            <div className="relative">
              <h1 className="text-[70px] md:text-[120px] font-black leading-[0.85] tracking-tighter mb-6 transform -skew-x-3 italic uppercase text-[#E4E3E0]">
                {activeTab === 'api' ? 'ENGINE\nSTUDIO' : activeTab === 'streaming' ? 'LOGISTICS\nSYNC' : 'SONIC\nEQUINOX'}
              </h1>
              <p className="max-w-md text-xs leading-relaxed opacity-50 ml-4 font-medium uppercase tracking-wide">
                {activeTab === 'api' 
                  ? 'Building high-performance distribution nodes via standard API interfaces. Monetization sync active.' 
                  : activeTab === 'streaming'
                  ? 'Global distribution node management. Syncing metadata across all verified streaming archives.'
                  : 'HenryTube Licensed distribution. Sync verified across all nodes. Metadata integrity at 100% efficiency.'}
              </p>
            </div>
          </header>
        )}

        {/* Floating Upload Trigger */}
        {user && activeTab !== 'api' && activeTab !== 'streaming' && !selectedContent && (
          <button 
            onClick={() => setIsUploadOpen(true)}
            className="fixed bottom-12 right-12 z-50 bg-[#E4E3E0] text-black px-8 py-4 text-[11px] uppercase tracking-[0.4em] font-black hover:bg-white shadow-2xl transition-all hover:-translate-y-1 active:scale-95"
          >
            UPLOAD MEDIA
          </button>
        )}

        {selectedContent ? (
          <VideoPlayer item={selectedContent} onBack={() => setSelectedContent(null)} />
        ) : activeTab === 'api' ? (
          <div className="space-y-20">
            <ApiManagement />
            {channel && <UriGenerator channelId={channel.id} />}
          </div>
        ) : activeTab === 'streaming' ? (
          <StreamingDistribution />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredContent.length > 0 ? (
              filteredContent.map(item => (
                <VideoCard key={item.id} item={item} onClick={() => setSelectedContent(item)} />
              ))
            ) : (
              Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-[#111] p-6 border border-[#E4E3E0]/5 h-64">
                   <div className="w-full h-32 bg-white/5 mb-4" />
                   <div className="h-4 bg-white/5 w-3/4 mb-2" />
                   <div className="h-2 bg-white/5 w-1/2" />
                </div>
              ))
            )}
          </div>
        )}
        
        {/* Editorial Footer */}
        <footer className="mt-32 pt-8 border-t border-[#E4E3E0]/10 flex flex-col md:flex-row items-center justify-between text-[9px] uppercase tracking-[0.3em] text-white/30 gap-4">
          <div className="flex gap-8">
            <span>Core: HG3-X Protocol</span>
            <span>Auth: HenryTube Verifier</span>
          </div>
          <div>© 2026 HG3 Media Infrastructure</div>
          <div className="flex gap-8">
            <span className="text-orange-500 font-bold">Monetization Active</span>
            <span>Metadata: Integrity Verified</span>
          </div>
        </footer>
      </main>

      <UploadModal 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)} 
        channel={channel} 
        onAcknowledge={() => setActiveTab('music')} 
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Dashboard />
    </AuthProvider>
  );
}
