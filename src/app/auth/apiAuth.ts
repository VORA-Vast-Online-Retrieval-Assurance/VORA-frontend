import { configureAuth } from '../../api/client.ts'
import { supabase } from './supabase.ts'

/**
 * Connects the API client to the Supabase session: every backend call carries the signed-in user's access token.
 * Registered when this module loads (not in an effect), so a screen's first request, which runs before its
 * parents' effects, already has a token.
 */
configureAuth({
  getToken: async (force) => {
    if (force) {
      const { data, error } = await supabase.auth.refreshSession()
      return error ? null : (data.session?.access_token ?? null)
    }
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  },
  // A refreshed token was refused too: clear the session. SIGNED_OUT empties AuthProvider's state and
  // RequireAuth sends the person to /login.
  onUnauthorized: () => {
    void supabase.auth.signOut({ scope: 'local' })
  },
})
