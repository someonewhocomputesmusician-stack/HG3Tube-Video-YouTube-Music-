import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Error handler as per integration guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// User Services
export async function syncUser(user: any) {
  if (!user) return;
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: serverTimestamp(),
        isArtist: false
      });
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}`);
  }
}

// Content Services
export interface ContentItem {
  id?: string;
  title: string;
  description: string;
  url: string;
  thumbnailUrl?: string;
  type: 'video' | 'music' | 'show' | 'film';
  visibility: 'public' | 'private';
  authorId: string;
  authorName: string;
  metadata?: any;
  monetization?: any;
  createdAt?: any;
  updatedAt?: any;
}

export async function uploadContent(item: ContentItem) {
  const contentRef = collection(db, 'content');
  try {
    const docRef = await addDoc(contentRef, {
      ...item,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (e) {
    handleFirestoreError(e, OperationType.CREATE, 'content');
  }
}

export async function getPublicContent(type?: 'video' | 'music' | 'show' | 'film') {
  const contentRef = collection(db, 'content');
  let q = query(contentRef, where('visibility', '==', 'public'));
  if (type) {
    q = query(q, where('type', '==', type));
  }
  try {
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ContentItem));
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, 'content');
  }
}

// API Key Services
export async function generateApiKey(userId: string) {
  const key = `hg3_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
  const clientId = `client_${Math.random().toString(36).substring(2)}`;
  const clientSecret = `secret_${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`;
  
  try {
    await setDoc(doc(db, 'api_keys', key), {
      key,
      userId,
      clientId,
      clientSecret,
      redirectUris: [],
      createdAt: serverTimestamp()
    });
    return key;
  } catch (e) {
    handleFirestoreError(e, OperationType.CREATE, 'api_keys');
  }
}

export async function updateApiKeyUris(key: string, uris: string[]) {
  try {
    await updateDoc(doc(db, 'api_keys', key), {
      redirectUris: uris
    });
  } catch (e) {
    handleFirestoreError(e, OperationType.UPDATE, `api_keys/${key}`);
  }
}

export async function getUserApiKeys(userId: string) {
  const q = query(collection(db, 'api_keys'), where('userId', '==', userId));
  try {
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data());
  } catch (e) {
    handleFirestoreError(e, OperationType.LIST, 'api_keys');
  }
}

// Channel Services
export interface Channel {
  id: string;
  ownerId: string;
  name: string;
  type: 'music' | 'gaming' | 'vlog' | 'tech' | 'general' | 'show' | 'film' | 'education' | 'news' | 'sports';
  description?: string;
  avatarUrl?: string;
  createdAt?: any;
}

export async function createChannel(channel: Channel) {
  try {
    await setDoc(doc(db, 'channels', channel.id), {
      ...channel,
      createdAt: serverTimestamp()
    });
  } catch (e) {
    handleFirestoreError(e, OperationType.CREATE, `channels/${channel.id}`);
  }
}

export async function getChannelByOwner(ownerId: string) {
  const q = query(collection(db, 'channels'), where('ownerId', '==', ownerId));
  try {
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Channel;
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, 'channels');
  }
}

// Token & URI Services
export async function generateAuthToken(userId: string, clientId: string) {
  const accessToken = `access_${Math.random().toString(36).substring(2)}`;
  const refreshToken = `refresh_${Math.random().toString(36).substring(2)}`;
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString();
  
  const tokenId = `${userId}_${clientId}`;
  try {
    await setDoc(doc(db, 'auth_tokens', tokenId), {
      accessToken,
      refreshToken,
      expiresAt,
      userId,
      clientId
    });
    return { accessToken, refreshToken, expiresAt };
  } catch (e) {
    handleFirestoreError(e, OperationType.CREATE, `auth_tokens/${tokenId}`);
  }
}

export async function generateUploadUri(channelId: string, type: string) {
  // Simulate a signed URI for uploading
  const signature = btoa(`${channelId}-${type}-${Date.now()}`).substring(0, 16);
  return `https://hg3tube.com/upload/gateway?channel=${channelId}&type=${type}&sig=${signature}`;
}

export async function deleteApiKey(key: string) {
  try {
    await deleteDoc(doc(db, 'api_keys', key));
  } catch (e) {
    handleFirestoreError(e, OperationType.DELETE, `api_keys/${key}`);
  }
}
