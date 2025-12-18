import { Card } from '@themesberg/react-bootstrap'
import React, { useEffect } from 'react'
import useAffiliatePrivateRoute from './useAffiliatePrivateRoute'
import { Navigate, useNavigate } from 'react-router-dom'
import { AffiliateRoute } from '../../routes'
import { getLoginToken } from '../../utils/storageUtils'
// import { useUserStore } from '../../store/store'
import AffiliateRouteWithSidebar from '../AffiliateRouteWithSidebar'
 
const AffiliatePrivateRoute = ({ isWithoutCard = false, children, _module }) => {
  const { userDetails, loading } = useAffiliatePrivateRoute()
  const navigate = useNavigate()
  // const isUserAffiliate = useUserStore((state) => state.isUserAffiliate)

  useEffect(() => { 
    if (!getLoginToken()) navigate(AffiliateRoute.AffiliateSignIn)
  }, [getLoginToken()])
  if (loading) {
    return <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>{"...loading"}</div>
  }
  return (
    userDetails && !loading ?
      <AffiliateRouteWithSidebar>
        {isWithoutCard
          ? children
          : <div className="app-page"><Card className='p-2'>{children}</Card></div>}
      </AffiliateRouteWithSidebar>
      : <Navigate replace to={AffiliateRoute.AffiliateSignIn} />
  )
}

export default AffiliatePrivateRoute
