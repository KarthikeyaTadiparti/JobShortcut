import { Button } from '@/components/ui/button'
import { useDispatch, useSelector } from 'react-redux'
import { type RootState } from '@/redux/reducers'
import { clearUser } from '@/redux/reducers/auth-reducer'
import { logoutUser } from '@/api'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, Navigate } from 'react-router-dom'

function Dashboard() {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { userData, isAuthenticated } = useSelector((state: RootState) => state.auth)

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    const logoutMutation = useMutation({
        mutationFn: logoutUser,
        onSuccess: () => {
            dispatch(clearUser())
            navigate('/login')
        },
    })

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6 text-zinc-50 font-sans">
            <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 shadow-xl backdrop-blur-md">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Profile Dashboard</h1>
                <p className="mt-2 text-sm text-zinc-400">Authenticated user details stored in Redux Toolkit.</p>

                <div className="mt-6 space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                    <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Name</span>
                        <p className="text-base font-medium text-zinc-200 mt-0.5">{userData.name || 'N/A'}</p>
                    </div>
                    <div className="border-t border-zinc-800 pt-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Email Address</span>
                        <p className="text-base font-medium text-zinc-200 mt-0.5">{userData.email || 'N/A'}</p>
                    </div>
                    <div className="border-t border-zinc-800 pt-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">User ID</span>
                        <p className="text-base font-mono text-zinc-300 mt-0.5">{userData.id ?? 'N/A'}</p>
                    </div>
                </div>

                <Button
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                    className="mt-6 w-full cursor-pointer bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
                >
                    {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
                </Button>
            </div>
        </div>
    )
}

export default Dashboard