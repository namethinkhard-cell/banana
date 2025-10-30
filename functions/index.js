// Firebase Cloud Functions for automatic room cleanup
// Deploy with: firebase deploy --only functions

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Automatically delete rooms when the last user leaves (unless marked as permanent)
 * Triggers whenever a user is removed from a room
 */
exports.cleanupEmptyRooms = functions.database
  .ref('/rooms/{roomCode}/users/{userId}')
  .onDelete(async (snapshot, context) => {
    const roomCode = context.params.roomCode;
    const roomRef = admin.database().ref(`/rooms/${roomCode}`);

    try {
      // Get the room data
      const roomSnapshot = await roomRef.once('value');

      if (!roomSnapshot.exists()) {
        console.log(`Room ${roomCode} already deleted`);
        return null;
      }

      const roomData = roomSnapshot.val();

      // Check if room is marked as permanent
      const isPermanent = roomData.metadata?.permanent === true;

      if (isPermanent) {
        console.log(`Room ${roomCode} is permanent, skipping deletion`);
        return null;
      }

      // Check if there are any remaining users
      const users = roomData.users || {};
      const userCount = Object.keys(users).length;

      if (userCount === 0) {
        // No users left and room is not permanent - delete the entire room
        await roomRef.remove();
        console.log(`Deleted empty room: ${roomCode}`);
        return { deleted: true, roomCode };
      } else {
        console.log(`Room ${roomCode} still has ${userCount} user(s), not deleting`);
        return null;
      }
    } catch (error) {
      console.error(`Error cleaning up room ${roomCode}:`, error);
      return null;
    }
  });

/**
 * Optional: Clean up stale rooms that have been inactive for 24+ hours
 * Run this as a scheduled function (e.g., every hour)
 */
exports.cleanupStaleRooms = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const roomsRef = admin.database().ref('/rooms');
    const now = Date.now();
    const STALE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours

    try {
      const roomsSnapshot = await roomsRef.once('value');

      if (!roomsSnapshot.exists()) {
        console.log('No rooms to clean up');
        return null;
      }

      const rooms = roomsSnapshot.val();
      const deletionPromises = [];

      for (const [roomCode, roomData] of Object.entries(rooms)) {
        // Skip permanent rooms
        if (roomData.metadata?.permanent === true) {
          continue;
        }

        // Check if all users are stale (haven't been seen in 24+ hours)
        const users = roomData.users || {};
        const userEntries = Object.values(users);

        if (userEntries.length === 0) {
          // Empty room - delete it
          deletionPromises.push(
            roomsRef.child(roomCode).remove()
              .then(() => console.log(`Deleted empty room: ${roomCode}`))
          );
          continue;
        }

        // Check if all users are stale
        const allUsersStale = userEntries.every(user => {
          const lastSeen = user.lastSeen || 0;
          return (now - lastSeen) > STALE_THRESHOLD;
        });

        if (allUsersStale) {
          deletionPromises.push(
            roomsRef.child(roomCode).remove()
              .then(() => console.log(`Deleted stale room: ${roomCode}`))
          );
        }
      }

      await Promise.all(deletionPromises);
      console.log(`Cleanup complete. Deleted ${deletionPromises.length} stale rooms.`);
      return { deletedCount: deletionPromises.length };
    } catch (error) {
      console.error('Error during stale room cleanup:', error);
      return null;
    }
  });
