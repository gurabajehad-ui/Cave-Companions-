import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, User, Image as ImageIcon, FileText } from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  author: string;
  createdAt: string;
  isPublished: boolean;
}

interface BlogViewProps {
  onBack: () => void;
}

export const BlogView: React.FC<BlogViewProps> = ({ onBack }) => {
  const { language, t } = useLanguage();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      // Fallback local storage or api (Assuming api.getBlogs might not exist yet in API, we'll implement it or use localStorage for now)
      const cached = localStorage.getItem('cave_blogs');
      if (cached) {
        const parsed = JSON.parse(cached);
        setBlogs(parsed.filter((b: BlogPost) => b.isPublished));
      } else {
        setBlogs([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (selectedBlog) {
    return (
      <div className="flex flex-col h-full bg-[#060a14] overflow-y-auto pb-[90px]">
        <div className="sticky top-0 z-40 bg-[#060a14]/90 backdrop-blur-xl border-b border-emerald-900/40 p-4">
          <button 
            onClick={() => setSelectedBlog(null)}
            className="flex items-center gap-2 text-emerald-100 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold">{language === 'bn' ? 'ফিরে যান' : 'Go Back'}</span>
          </button>
        </div>
        <div className="p-4 space-y-4 max-w-2xl mx-auto w-full">
          {selectedBlog.imageUrl && (
            <img 
              src={selectedBlog.imageUrl} 
              alt={selectedBlog.title} 
              className="w-full h-48 sm:h-64 object-cover rounded-2xl shadow-lg border border-[#0c4334]"
            />
          )}
          <h1 className="text-xl sm:text-2xl font-black text-white leading-snug">
            {selectedBlog.title}
          </h1>
          <div className="flex items-center gap-4 text-xs text-emerald-400/80">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {selectedBlog.author}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(selectedBlog.createdAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap pt-2">
            {selectedBlog.content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#060a14] overflow-y-auto pb-[90px]">
      <div className="sticky top-0 z-40 bg-[#060a14]/90 backdrop-blur-xl border-b border-emerald-900/40 p-4 flex items-center gap-3">
        <button 
          onClick={onBack}
          className="p-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-black text-white">{language === 'bn' ? 'ব্লগ ও আর্টিকেল' : 'Blog & Articles'}</h1>
      </div>

      <div className="p-4 max-w-2xl mx-auto w-full space-y-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-12 px-4">
            <FileText className="w-12 h-12 text-emerald-800 mx-auto mb-3 opacity-50" />
            <p className="text-emerald-300/70 font-medium">{language === 'bn' ? 'এখনও কোনো ব্লগ পোস্ট করা হয়নি।' : 'No blog posts available yet.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {blogs.map(blog => (
              <div 
                key={blog.id} 
                onClick={() => setSelectedBlog(blog)}
                className="bg-[#022119] border border-[#0c4334] rounded-2xl overflow-hidden cursor-pointer hover:border-emerald-600/50 transition-colors shadow-md"
              >
                {blog.imageUrl && (
                  <img src={blog.imageUrl} alt={blog.title} className="w-full h-32 object-cover" />
                )}
                <div className="p-4 space-y-2">
                  <h3 className="text-base font-bold text-white line-clamp-2">{blog.title}</h3>
                  <p className="text-xs text-emerald-100/70 line-clamp-2">{blog.content}</p>
                  <div className="flex items-center gap-3 text-[10px] text-emerald-400/60 pt-2">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {blog.author}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(blog.createdAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
