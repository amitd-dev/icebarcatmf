import React, { useState } from 'react'
import Sidebar from '../Sidebar'
// import { useUserStore } from '../../store/store'
// import useCheckPermission from '../../utils/checkPermission'
import './routewithsidebar.scss'
import Navbar from '../Navbar/Navbar'

const RouteWithSidebar = ({ children }) => {
  // const { userDetails } = useUserStore((state) => state)
  // const { isHidden } = useCheckPermission()
  const [open, setOpen] = useState(false)
  const [collapseSidebar, setCollapseSidebar] = useState(false)

  return (
    <>
      <Sidebar open={open} collapseSidebar={collapseSidebar} setCollapseSidebar={setCollapseSidebar} />
      <main className={`${!collapseSidebar ? 'content px-0' : 'content-collapsed px-0'} ${open ? 'is-menu-open' : ''}`}>
        <Navbar open={open} setOpen={setOpen} collapseSidebar={collapseSidebar} setCollapseSidebar={setCollapseSidebar} />
        <div className='component-container'>
          {children}
        </div>
      </main>
    </>
  )
}

export default RouteWithSidebar
