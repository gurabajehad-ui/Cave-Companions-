import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Image as ImageIcon, Save, X, Eye } from 'lucide-react';
import type { BlogPost } from './BlogView';

export const BlogManagement: React.FC = () => {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBlog, setCurrentBlog] = useState<Partial<BlogPost>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem('cave_blogs');
    if (cached) {
      setBlogs(JSON.parse(cached));
    }
  }, []);

  const saveBlogs = (newBlogs: BlogPost[]) => {
    setBlogs(newBlogs);
    localStorage.setItem('cave_blogs', JSON.stringify(newBlogs));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentBlog({...currentBlog, imageUrl: reader.result as string});
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!currentBlog.title || !currentBlog.content) return;

    if (currentBlog.id) {
      saveBlogs(blogs.map(b => b.id === currentBlog.id ? currentBlog as BlogPost : b));
    } else {
      const newBlog: BlogPost = {
        ...currentBlog,
        id: Date.now().toString(),
        author: currentBlog.author || 'Admin',
        createdAt: new Date().toISOString(),
        isPublished: currentBlog.isPublished ?? true,
      } as BlogPost;
      saveBlogs([newBlog, ...blogs]);
    }
    setIsEditing(false);
    setCurrentBlog({});
  };

  const handleDelete = (id: string) => {
    if (deleteConfirmId === id) {
      saveBlogs(blogs.filter(b => b.id !== id));
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  if (isEditing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            {currentBlog.id ? 'ব্লগ সম্পাদনা' : 'নতুন ব্লগ'}
          </h2>
          <button 
            onClick={() => setIsEditing(false)}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">শিরোনাম</label>
            <input 
              type="text" 
              value={currentBlog.title || ''} 
              onChange={e => setCurrentBlog({...currentBlog, title: e.target.value})}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
              placeholder="ব্লগের শিরোনাম..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">ছবি আপলোড করুন (ঐচ্ছিক)</label>
            <div className="flex items-center gap-4">
              {currentBlog.imageUrl && (
                <div className="relative group">
                  <img src={currentBlog.imageUrl} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-slate-700" />
                  <button onClick={() => setCurrentBlog({...currentBlog, imageUrl: ''})} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <label className="flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-lg cursor-pointer transition-colors border border-slate-700">
                <ImageIcon className="w-4 h-4 mr-2" />
                <span>ছবি নির্বাচন করুন</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">বিস্তারিত লেখা</label>
            <textarea 
              rows={8}
              value={currentBlog.content || ''} 
              onChange={e => setCurrentBlog({...currentBlog, content: e.target.value})}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white resize-none"
              placeholder="ব্লগের মূল লেখা..."
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={currentBlog.isPublished ?? true}
                onChange={e => setCurrentBlog({...currentBlog, isPublished: e.target.checked})}
                className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500"
              />
              <span className="text-sm text-slate-300">প্রকাশিত (পাবলিক)</span>
            </label>
          </div>
          <button 
            onClick={handleSave}
            disabled={!currentBlog.title || !currentBlog.content}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg disabled:opacity-50"
          >
            সংরক্ষণ করুন
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">ব্লগ ম্যানেজমেন্ট</h2>
        <button 
          onClick={() => {
            setCurrentBlog({ isPublished: true });
            setIsEditing(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-sm font-semibold rounded-lg transition-colors border border-amber-500/20"
        >
          <Plus className="w-4 h-4" /> নতুন ব্লগ
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {blogs.map(blog => (
          <div key={blog.id} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden p-4 space-y-3">
            {blog.imageUrl && (
              <img src={blog.imageUrl} alt={blog.title} className="w-full h-32 object-cover rounded-lg" />
            )}
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold text-white line-clamp-2">{blog.title}</h3>
                {!blog.isPublished && (
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 shrink-0">Draft</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{blog.content}</p>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[10px] text-slate-500">{new Date(blog.createdAt).toLocaleDateString()}</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    setCurrentBlog(blog);
                    setIsEditing(true);
                  }}
                  className="p-1.5 text-blue-400 hover:bg-blue-400/10 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(blog.id)}
                  className={`p-1.5 rounded-lg flex items-center gap-1 transition-colors ${deleteConfirmId === blog.id ? 'bg-rose-500 text-white' : 'text-rose-400 hover:bg-rose-400/10'}`}
                >
                  {deleteConfirmId === blog.id ? <span className="text-[10px] font-bold px-1">নিশ্চিত?</span> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {blogs.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-800 rounded-xl">
            <p className="text-slate-500 text-sm">কোনো ব্লগ পাওয়া যায়নি</p>
          </div>
        )}
      </div>
    </div>
  );
};
