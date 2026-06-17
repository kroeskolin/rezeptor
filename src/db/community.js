import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// Ein lokales Rezept in die öffentliche Firestore-Sammlung hochladen.
// user = das eingeloggte Firebase-User-Objekt (aus useAuth)
export async function publishRecipe(recipe, user) {
  if (!user) throw new Error('Nicht eingeloggt');

  const docData = {
    authorId:   user.uid,
    authorName: user.displayName || 'Unbekannt',
    title:      recipe.title || '',
    subtitle:   recipe.subtitle || '',
    servings:   Number(recipe.servings) || 0,
    prepTime:   Number(recipe.prepTime) || 0,
    cookTime:   Number(recipe.cookTime) || 0,
    ingredients: recipe.ingredients || [],
    steps:      recipe.steps || '',
    tags:       recipe.tags || [],
    likeCount:    0,
    commentCount: 0,
    createdAt:  serverTimestamp(),
  };

  const ref = await addDoc(collection(db, 'recipes'), docData);
  return ref.id; // die neue Firestore-ID
}

// Alle veröffentlichten Rezepte laden, neueste zuerst.
export async function getFeed() {
  const q = query(collection(db, 'recipes'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}