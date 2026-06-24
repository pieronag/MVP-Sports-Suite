export const auth = {
  currentUser: null,
  onAuthStateChanged: () => () => {},
};

export const db = {};

export const storage = {};

export const functions = {};

export const getAuth = () => auth;
export const getFirestore = () => db;
export const getStorage = () => storage;
export const getFunctions = () => functions;

export default { auth, db, storage, functions };
