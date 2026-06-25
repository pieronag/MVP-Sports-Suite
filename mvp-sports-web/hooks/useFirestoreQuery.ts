import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  collection, query, where, orderBy, limit, getDocs, doc, getDoc, onSnapshot,
  QueryConstraint, type DocumentData, type FirestoreError,
} from "firebase/firestore";
import { useEffect } from "react";
import { db } from "@/services/firebase";

type QueryKey = readonly [string, ...unknown[]];

export function useCollection<T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  options?: { enabled?: boolean; refetchInterval?: number; realtime?: boolean },
) {
  const key: QueryKey = [collectionName, ...constraints.map(String)];

  return useQuery<T[], FirestoreError>({
    queryKey: key,
    queryFn: async () => {
      const q = query(collection(db, collectionName), ...constraints);
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as T));
    },
    enabled: options?.enabled ?? true,
    refetchInterval: options?.refetchInterval ?? (options?.realtime ? 30_000 : 120_000),
    staleTime: options?.realtime ? 10_000 : 60_000,
  });
}

export function useCollectionRealtime<T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  options?: { enabled?: boolean },
) {
  const key: QueryKey = [collectionName, "realtime", ...constraints.map(String)];
  const queryClient = useQueryClient();

  useEffect(() => {
    if (options?.enabled === false) return;

    const q = query(collection(db, collectionName), ...constraints);
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as T));
        queryClient.setQueryData(key, data);
      },
      (error) => {
        console.error(`Realtime error (${collectionName}):`, error);
      },
    );

    return () => unsubscribe();
  }, [key.join(","), options?.enabled]);

  return useQuery<T[], FirestoreError>({
    queryKey: key,
    queryFn: async () => {
      const q = query(collection(db, collectionName), ...constraints);
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as unknown as T));
    },
    enabled: options?.enabled ?? true,
    staleTime: Infinity,
  });
}

export function useDocument<T = DocumentData>(
  collectionName: string,
  docId: string | undefined,
  options?: { enabled?: boolean; refetchInterval?: number },
) {
  return useQuery<T | null, FirestoreError>({
    queryKey: [collectionName, docId] as const,
    queryFn: async () => {
      if (!docId) return null;
      const snap = await getDoc(doc(db, collectionName, docId));
      return snap.exists() ? ({ id: snap.id, ...snap.data() } as unknown as T) : null;
    },
    enabled: (options?.enabled ?? true) && !!docId,
    refetchInterval: options?.refetchInterval ?? 120_000,
  });
}
