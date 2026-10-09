import { collection, addDoc, query, orderBy, onSnapshot, Timestamp, limit, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface ChatMessage {
    id?: string;
    senderId: string;
    senderName: string;
    senderPhoto?: string;
    text: string;
    createdAt: any;
}

export const chatService = {
    /**
     * Send a message to a team's strategy room
     */
    async sendMessage(teamId: string, message: {
        senderId: string;
        senderName: string;
        senderPhoto?: string;
        text: string;
    }): Promise<string> {
        const messagesRef = collection(db, 'teams', teamId, 'messages');
        const docRef = await addDoc(messagesRef, {
            ...message,
            createdAt: Timestamp.now()
        });

        // Update team with lastMessageAt
        const teamRef = doc(db, 'teams', teamId);
        await updateDoc(teamRef, {
            lastMessageAt: new Date().toISOString()
        });

        return docRef.id;
    },

    /**
     * Subscribe to real-time messages for a team chat
     * Returns an unsubscribe function
     */
    subscribeToMessages(
        teamId: string,
        callback: (messages: ChatMessage[]) => void,
        messageLimit: number = 50
    ): () => void {
        const messagesRef = collection(db, 'teams', teamId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(messageLimit));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const messages: ChatMessage[] = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage))
                .reverse(); // Reverse to show oldest first
            callback(messages);
        }, (error) => {
            console.error('Chat subscription error:', error);
        });

        return unsubscribe;
    }
};
