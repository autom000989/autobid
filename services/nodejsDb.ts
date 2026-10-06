// Node.js Live Backend Reactive Database & Auth Adapter
// Replaces Firebase Auth and Firestore with 100% live Node.js REST & Realtime synchronization

export interface DocRef {
  type: 'doc';
  collection: string;
  id: string;
  path: string;
}

export interface CollectionRef {
  type: 'collection';
  id: string;
  path: string;
}

export interface QueryConstraint {
  type: 'where' | 'orderBy';
  field: string;
  op?: string;
  value?: any;
  direction?: 'asc' | 'desc';
}

export interface QueryRef {
  type: 'query';
  collectionRef: CollectionRef;
  constraints: QueryConstraint[];
}

export interface DocumentSnapshot<T = any> {
  id: string;
  exists: () => boolean;
  data: () => T | undefined;
}

export interface QuerySnapshot<T = any> {
  empty: boolean;
  size: number;
  docs: Array<DocumentSnapshot<T>>;
  forEach: (callback: (doc: DocumentSnapshot<T>) => void) => void;
}

// ----------------------------------------------------
// FIELD VALUES HELPERS (increment, arrayUnion, etc.)
// ----------------------------------------------------
export function serverTimestamp() {
  return Date.now();
}

export function increment(value: number) {
  return { __fieldTransform: 'increment', value };
}

export function arrayUnion(...items: any[]) {
  return { __fieldTransform: 'arrayUnion', items };
}

export function arrayRemove(...items: any[]) {
  return { __fieldTransform: 'arrayRemove', items };
}

export function deleteField() {
  return { __fieldTransform: 'deleteField' };
}

// ----------------------------------------------------
// DATABASE & REFERENCES
// ----------------------------------------------------
export interface Database {
  _isNodeJsBackend: boolean;
}

export const db: Database = {
  _isNodeJsBackend: true
};

export function getFirestore(app?: any, dbName?: string): Database {
  return db;
}

export function collection(db: Database, path: string): CollectionRef {
  return {
    type: 'collection',
    id: path,
    path
  };
}

export function doc(dbOrCol: Database | CollectionRef, pathOrId: string, maybeId?: string): DocRef {
  if (maybeId) {
    // doc(db, 'collection', 'id')
    return {
      type: 'doc',
      collection: pathOrId,
      id: maybeId,
      path: `${pathOrId}/${maybeId}`
    };
  }
  // doc(collectionRef, 'id')
  const colRef = dbOrCol as CollectionRef;
  return {
    type: 'doc',
    collection: colRef.id || colRef.path,
    id: pathOrId,
    path: `${colRef.path}/${pathOrId}`
  };
}

export function query(collectionRef: CollectionRef, ...constraints: QueryConstraint[]): QueryRef {
  return {
    type: 'query',
    collectionRef,
    constraints
  };
}

export function where(field: string, op: string, value: any): QueryConstraint {
  return {
    type: 'where',
    field,
    op,
    value
  };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): QueryConstraint {
  return {
    type: 'orderBy',
    field,
    direction
  };
}

// ----------------------------------------------------
// LOCAL CACHE & SNAPSHOT EMITTER
// ----------------------------------------------------
const localSubscribers = new Set<() => void>();

export function notifyChange() {
  localSubscribers.forEach(cb => {
    try {
      cb();
    } catch (e) {
      console.error('[nodejsDb] Error in change subscriber:', e);
    }
  });
}

function matchesConstraints(item: any, constraints: QueryConstraint[]): boolean {
  if (!constraints || constraints.length === 0) return true;
  for (const c of constraints) {
    if (c.type === 'where') {
      const val = item[c.field];
      if (c.op === '==' && val !== c.value) return false;
      if (c.op === '!=' && val === c.value) return false;
      if (c.op === '>' && !(val > c.value)) return false;
      if (c.op === '>=' && !(val >= c.value)) return false;
      if (c.op === '<' && !(val < c.value)) return false;
      if (c.op === '<=' && !(val <= c.value)) return false;
      if (c.op === 'array-contains') {
        if (!Array.isArray(val) || !val.includes(c.value)) return false;
      }
    }
  }
  return true;
}

// ----------------------------------------------------
// CRUD OPERATIONS (Communicating with Node.js Backend)
// ----------------------------------------------------

export async function getDoc(docRef: DocRef): Promise<DocumentSnapshot> {
  try {
    const res = await fetch(`/api/live/collections/${encodeURIComponent(docRef.collection)}/${encodeURIComponent(docRef.id)}`);
    if (!res.ok) {
      return {
        id: docRef.id,
        exists: () => false,
        data: () => undefined
      };
    }
    const json = await res.json();
    if (!json.exists || !json.data) {
      return {
        id: docRef.id,
        exists: () => false,
        data: () => undefined
      };
    }
    return {
      id: docRef.id,
      exists: () => true,
      data: () => json.data
    };
  } catch (err) {
    console.warn(`[nodejsDb] getDoc failed for ${docRef.path}:`, err);
    return {
      id: docRef.id,
      exists: () => false,
      data: () => undefined
    };
  }
}

export async function getDocFromServer(docRef: DocRef): Promise<DocumentSnapshot> {
  return getDoc(docRef);
}

export async function getDocs(target: CollectionRef | QueryRef): Promise<QuerySnapshot> {
  const colName = target.type === 'collection' ? target.id : target.collectionRef.id;
  const constraints = target.type === 'query' ? target.constraints : [];

  try {
    const res = await fetch(`/api/live/collections/${encodeURIComponent(colName)}`);
    if (!res.ok) {
      return { empty: true, size: 0, docs: [], forEach: () => {} };
    }
    const json = await res.json();
    let items = (json.items || []) as any[];

    // Filter
    items = items.filter(it => matchesConstraints(it, constraints));

    // Sort if orderBy present
    const order = constraints.find(c => c.type === 'orderBy');
    if (order) {
      items.sort((a, b) => {
        const valA = a[order.field];
        const valB = b[order.field];
        if (valA === valB) return 0;
        const res = valA > valB ? 1 : -1;
        return order.direction === 'desc' ? -res : res;
      });
    }

    const docs = items.map(item => ({
      id: item.id || item._id,
      exists: () => true,
      data: () => item
    }));

    return {
      empty: docs.length === 0,
      size: docs.length,
      docs,
      forEach: (cb) => docs.forEach(cb)
    };
  } catch (err) {
    console.warn(`[nodejsDb] getDocs failed for ${colName}:`, err);
    return { empty: true, size: 0, docs: [], forEach: () => {} };
  }
}

export async function setDoc(docRef: DocRef, data: any, options?: { merge?: boolean }): Promise<void> {
  try {
    await fetch(`/api/live/collections/${encodeURIComponent(docRef.collection)}/${encodeURIComponent(docRef.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, merge: options?.merge ?? false })
    });
    notifyChange();
  } catch (err) {
    console.error(`[nodejsDb] setDoc failed for ${docRef.path}:`, err);
    throw err;
  }
}

export async function updateDoc(docRef: DocRef, data: any): Promise<void> {
  try {
    await fetch(`/api/live/collections/${encodeURIComponent(docRef.collection)}/${encodeURIComponent(docRef.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });
    notifyChange();
  } catch (err) {
    console.error(`[nodejsDb] updateDoc failed for ${docRef.path}:`, err);
    throw err;
  }
}

export async function addDoc(collectionRef: CollectionRef, data: any): Promise<DocRef> {
  const generatedId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 7)}`;
  const docRef: DocRef = {
    type: 'doc',
    collection: collectionRef.id,
    id: generatedId,
    path: `${collectionRef.path}/${generatedId}`
  };

  try {
    await fetch(`/api/live/collections/${encodeURIComponent(collectionRef.id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: generatedId, data })
    });
    notifyChange();
    return docRef;
  } catch (err) {
    console.error(`[nodejsDb] addDoc failed for ${collectionRef.path}:`, err);
    throw err;
  }
}

export async function deleteDoc(docRef: DocRef): Promise<void> {
  try {
    await fetch(`/api/live/collections/${encodeURIComponent(docRef.collection)}/${encodeURIComponent(docRef.id)}`, {
      method: 'DELETE'
    });
    notifyChange();
  } catch (err) {
    console.error(`[nodejsDb] deleteDoc failed for ${docRef.path}:`, err);
    throw err;
  }
}

// ----------------------------------------------------
// REALTIME ONSNAPSHOT LISTENER (Continuous sync with Node.js)
// ----------------------------------------------------
export function onSnapshot(
  target: DocRef | CollectionRef | QueryRef,
  onNext: (snapshot: any) => void,
  onError?: (error: any) => void
): () => void {
  let isSubscribed = true;
  let lastDataString = '';

  const fetchAndEmit = async () => {
    if (!isSubscribed) return;
    try {
      if (target.type === 'doc') {
        const snap = await getDoc(target);
        if (!isSubscribed) return;
        const currentData = snap.data();
        const str = JSON.stringify(currentData);
        if (str !== lastDataString) {
          lastDataString = str;
          onNext(snap);
        }
      } else {
        const snap = await getDocs(target);
        if (!isSubscribed) return;
        const currentData = snap.docs.map(d => d.data());
        const str = JSON.stringify(currentData);
        if (str !== lastDataString) {
          lastDataString = str;
          onNext(snap);
        }
      }
    } catch (err) {
      if (isSubscribed && onError) {
        onError(err);
      }
    }
  };

  // Immediate initial load
  fetchAndEmit();

  // Poll server every 2000ms for fresh live state across tabs & machines
  const interval = setInterval(fetchAndEmit, 2000);

  // Also hook into local write changes for instant 0ms latency UI updates
  const localChangeHandler = () => {
    fetchAndEmit();
  };
  localSubscribers.add(localChangeHandler);

  return () => {
    isSubscribed = false;
    clearInterval(interval);
    localSubscribers.delete(localChangeHandler);
  };
}

// ----------------------------------------------------
// AUTHENTICATION ENGINE (Pure Node.js Backend Auth)
// ----------------------------------------------------

export interface AuthUser {
  uid: string;
  id: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
}

export class GoogleAuthProvider {
  providerId = 'google.com';
}

export class OAuthProvider {
  constructor(public providerId: string) {}
}

const AUTH_STORAGE_KEY = 'autobid_nodejs_active_auth_user';

function getStoredAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[nodejsDb] Error reading stored auth user:', e);
  }
  // Real world: unauthenticated by default until a real user registers or signs in
  return null;
}

function storeAuthUser(user: AuthUser | null) {
  try {
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch (e) {
    console.warn('[nodejsDb] Error writing stored auth user:', e);
  }
}

class NodejsAuth {
  currentUser: AuthUser | null = getStoredAuthUser();
  private listeners = new Set<(user: AuthUser | null) => void>();

  constructor() {
    // Notify on startup
    setTimeout(() => {
      this.notifyListeners();
    }, 50);
  }

  notifyListeners() {
    this.listeners.forEach(cb => {
      try {
        cb(this.currentUser);
      } catch (err) {
        console.error('[nodejsDb] Auth listener error:', err);
      }
    });
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    this.listeners.add(callback);
    // Call immediately with current user
    callback(this.currentUser);
    return () => {
      this.listeners.delete(callback);
    };
  }

  async signInWithEmailAndPassword(email: string, pass: string): Promise<{ user: AuthUser }> {
    const res = await fetch('/api/live/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to sign in');
    }
    const user: AuthUser = {
      uid: data.user.id,
      id: data.user.id,
      email: data.user.email,
      displayName: data.user.fullName || data.user.username,
      photoURL: data.user.avatarUrl
    };
    this.currentUser = user;
    storeAuthUser(user);
    this.notifyListeners();
    return { user };
  }

  async createUserWithEmailAndPassword(email: string, pass: string): Promise<{ user: AuthUser }> {
    const res = await fetch('/api/live/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create account');
    }
    const user: AuthUser = {
      uid: data.user.id,
      id: data.user.id,
      email: data.user.email,
      displayName: data.user.fullName || data.user.username,
      photoURL: data.user.avatarUrl
    };
    this.currentUser = user;
    storeAuthUser(user);
    this.notifyListeners();
    return { user };
  }

  async signInWithPopup(provider: any): Promise<{ user: AuthUser }> {
    const providerName = provider?.providerId || 'google.com';
    const res = await fetch('/api/live/auth/social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: providerName })
    });
    const data = await res.json();
    const user: AuthUser = {
      uid: data.user.id,
      id: data.user.id,
      email: data.user.email,
      displayName: data.user.fullName || data.user.username,
      photoURL: data.user.avatarUrl
    };
    this.currentUser = user;
    storeAuthUser(user);
    this.notifyListeners();
    return { user };
  }

  async signOut(): Promise<void> {
    try {
      await fetch('/api/live/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network errors on logout
    }
    this.currentUser = null;
    storeAuthUser(null);
    this.notifyListeners();
  }
}

export const auth = new NodejsAuth();

export function getAuth(app?: any): NodejsAuth {
  return auth;
}

export function onAuthStateChanged(authInstance: NodejsAuth, callback: (user: AuthUser | null) => void): () => void {
  return authInstance.onAuthStateChanged(callback);
}

export async function signOut(authInstance: NodejsAuth): Promise<void> {
  return authInstance.signOut();
}

export async function signInWithEmailAndPassword(authInstance: NodejsAuth, email: string, pass: string) {
  return authInstance.signInWithEmailAndPassword(email, pass);
}

export async function createUserWithEmailAndPassword(authInstance: NodejsAuth, email: string, pass: string) {
  return authInstance.createUserWithEmailAndPassword(email, pass);
}

export async function signInWithPopup(authInstance: NodejsAuth, provider: any) {
  return authInstance.signInWithPopup(provider);
}

export const googleProvider = new GoogleAuthProvider();
export const microsoftProvider = new OAuthProvider('microsoft.com');

export function initializeApp(config?: any) {
  return { name: '[NodeJsLiveApp]' };
}

export const app = initializeApp();
