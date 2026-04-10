import { useDatabase } from '@nozbe/watermelondb/hooks'
import { database } from './index'

export const useAppDatabase = () => {
    // A simple wrapper to grab the database instance in any component
    return useDatabase()
}

export const syncWithSupabase = async () => {
    // This function will be called by a Background Task and manual refresh.
    // It will push local SQLite changes to Supabase, and pull new changes.
    if (__DEV__) console.log("Sync requested (Offline-First)");
}
