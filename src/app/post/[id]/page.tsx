'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { postsAPI } from '@/lib/api';
import RealPostCard from '@/components/feed/RealPostCard';

interface ApiPost {
  id: string;
  content: string;
  postType: string;
  media: { mediaUrl: string; mediaType: string }[];
  author: { id: string; username: string; fullName: string; avatar?: string };
  _count: { likes: number; comments: number; shares: number };
  isLiked: boolean;
  createdAt: string;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<ApiPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const postId = params.id as string;

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const response = await postsAPI.getPost(postId);
        console.log('Post fetched:', response);
        
        if (response.success && response.data) {
          setPost(response.data);
        } else {
          setError('Post not found');
        }
      } catch (err: any) {
        console.error('Failed to fetch post:', err);
        setError(err?.message || 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const handleLikeToggle = (postId: string, liked: boolean) => {
    if (post) {
      setPost({
        ...post,
        isLiked: liked,
        _count: { ...post._count, likes: post._count.likes + (liked ? 1 : -1) }
      });
    }
  };

  const handleCommentAdded = (postId: string, newCommentCount: number) => {
    if (post) {
      setPost({
        ...post,
        _count: { ...post._count, comments: newCommentCount }
      });
    }
  };

  const handlePostDelete = (postId: string) => {
    router.push('/');
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        background: 'var(--bg)'
      }}>
        <Loader2 size={40} style={{ animation: 'spin 0.7s linear infinite', color: 'var(--accent)' }} />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        background: 'var(--bg)',
        padding: '20px'
      }}>
        <div style={{ 
          background: 'var(--bg2)', 
          border: '1px solid var(--border)', 
          borderRadius: 16, 
          padding: '40px',
          textAlign: 'center',
          maxWidth: 400
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😢</div>
          <h2 style={{ color: 'var(--text)', marginBottom: 8, fontSize: 20 }}>Post Not Found</h2>
          <p style={{ color: 'var(--text3)', marginBottom: 20 }}>The post you're looking for doesn't exist or has been deleted.</p>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, var(--accent), var(--accent3))',
              border: 'none',
              borderRadius: 10,
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'var(--bg)',
      padding: '20px'
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {/* Back button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => router.back()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'none',
            border: 'none',
            color: 'var(--text2)',
            fontSize: 14,
            cursor: 'pointer',
            padding: '10px 0',
            marginBottom: 16,
            fontFamily: 'DM Sans, sans-serif'
          }}
          whileHover={{ x: -5 }}
        >
          <ArrowLeft size={18} />
          Back
        </motion.button>

        {/* Post card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <RealPostCard
            post={post}
            onLikeToggle={handleLikeToggle}
            onCommentAdded={handleCommentAdded}
            onPostDelete={handlePostDelete}
          />
        </motion.div>

        {/* Comments section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          style={{
            marginTop: 20,
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: '20px'
          }}
        >
          <h3 style={{ 
            fontSize: 16, 
            fontWeight: 600, 
            color: 'var(--text)',
            marginBottom: 16,
            fontFamily: 'DM Sans, sans-serif'
          }}>
            Comments ({post._count.comments})
          </h3>
          
          {/* You can add a comments list component here */}
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: 'var(--text3)'
          }}>
            <p>Comment section coming soon!</p>
          </div>
        </motion.div>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}