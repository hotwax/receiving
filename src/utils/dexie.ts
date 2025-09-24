import Dexie, { type EntityTable } from 'dexie';

// interface for the order data
export interface Order {
  orderId: string;
  data: any;
  lastUpdatedStamp: number;
}

// Dexie database
const db = new Dexie('TransferOrders') as Dexie & {
  orders: EntityTable<Order, 'orderId'>; // Typed table with orderId as primary key
};

// Schema declaration
db.version(1).stores({
  orders: 'orderId, lastUpdatedStamp', // Primary key and indexed props
});

// Function to get an order by orderId
export async function getOrder(orderId: string): Promise<Order | undefined> {
  try {
    return await db.orders.get(orderId);
  } catch (error) {
    console.error('Error fetching order from DB:', error);
    throw error;
  }
}

// Function to save an order
export async function saveOrder(orderId: string, data: any): Promise<void> {
  try {
    await db.orders.put({
      orderId,
      data,
      lastUpdatedStamp: Date.now(),
    });
  } catch (error) {
    console.error('Error saving order to DB:', error);
    throw error;
  }
}

export { db };