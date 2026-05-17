const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

const getAuthToken = () => {
  return localStorage.getItem('token');
};

const headers = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${getAuthToken()}`
});

// Fetch feed posts
export const fetchFeed = async (page = 1, limit = 15) => {
  try {
    const response = await fetch(
      `${API_URL}/posts/feed?page=${page}&limit=${limit}`,
      { headers: headers() }
    );
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  } catch (error) {
    console.error('Error fetching feed:', error);
    throw error;
  }
};

// Fetch explore posts
export const fetchExplore = async (page = 1, limit = 15) => {
  try {
    const response = await fetch(
      `${API_URL}/posts/explore?page=${page}&limit=${limit}`,
      { headers: headers() }
    );
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  } catch (error) {
    console.error('Error fetching explore:', error);
    throw error;
  }
};

// Fetch single post
export const fetchPost = async (postId) => {
  try {
    const response = await fetch(`${API_URL}/posts/${postId}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(getAuthToken() && { 'Authorization': `Bearer ${getAuthToken()}` })
      }
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  } catch (error) {
    console.error('Error fetching post:', error);
    throw error;
  }
};

// Create new post
export const createPost = async (postData) => {
  try {
    const response = await fetch(`${API_URL}/posts`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        content: postData.text,
        mediaUrl: postData.img || null,
        mediaType: postData.type === 'video' ? 'VIDEO' : 'IMAGE',
        postType: postData.type?.toUpperCase() || 'TEXT'
      })
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
};

// Like/Unlike post
export const likePost = async (postId) => {
  try {
    const response = await fetch(`${API_URL}/posts/${postId}/like`, {
      method: 'POST',
      headers: headers()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
};

// Save/Unsave post
export const savePost = async (postId) => {
  // Implement save functionality based on your backend
  // This is a mock for now
  return { success: true, data: { saved: true } };
};

// Delete post
export const deletePost = async (postId) => {
  try {
    const response = await fetch(`${API_URL}/posts/${postId}`, {
      method: 'DELETE',
      headers: headers()
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
};