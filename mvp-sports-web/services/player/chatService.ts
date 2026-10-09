import { collection, query, orderBy, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface ChatMessage {
    id?: string;
    text: string;
    senderId: string;
    senderName: string;
    createdAt: Timestamp;
}

export const chatService = {
    subscribeToMessages(teamId: string, callback: (messages: ChatMessage[]) => void): () => void {
        const messagesRef = collection(db, 'teams', teamId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snap) => {
            const messages = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage));
            callback(messages);
        });
        return unsubscribe;
    },

    async sendMessage(teamId: string, message: { text: string; senderId: string; senderName: string }) {
        const messagesRef = collection(db, 'teams', teamId, 'messages');
        await addDoc(messagesRef, {
            ...message,
            createdAt: Timestamp.now()
        });
    }
};
