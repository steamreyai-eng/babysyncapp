import { useDatabase } from '@nozbe/watermelondb/hooks'

export const useAppDatabase = () => {
    // A simple wrapper to grab the database instance in any component
    return useDatabase()
}
