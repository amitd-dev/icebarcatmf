/*
Filename: index.js
Description: Entry Function for our react project.
Author: uchouhan
Created at: 2023/03/03
Last Modified: 2023/03/21
Version: 0.1.0
*/
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

// core styles
import './scss/volt.scss'

// vendor styles
import 'react-datetime/css/react-datetime.css'
import 'react-date-range/dist/styles.css'
import 'react-date-range/dist/theme/default.css'
import 'react-loading-skeleton/dist/skeleton.css'
import { Toaster } from 'react-hot-toast'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { QueryClientProvider } from '@tanstack/react-query'
import { setupInterceptors } from './utils/axios'
import queryClient from './reactQuery/queryClientSetup'
import './config/i18n';
import MainRoute from './pages/MainRoute'
setupInterceptors()

// Perf: automatically enable a "low power" mode on weaker devices to reduce GPU-heavy
// effects (mainly backdrop-filter blurs). Users can override via localStorage:
// - localStorage.setItem('gs:lowPower', '1') to force ON
// - localStorage.setItem('gs:lowPower', '0') to force OFF
try {
  const forced = window.localStorage?.getItem('gs:lowPower')
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
  const reduceData = window.matchMedia?.('(prefers-reduced-data: reduce)')?.matches
  const cores = navigator.hardwareConcurrency || 8
  const mem = navigator.deviceMemory || 8
  const autoLowPower = !!reduceMotion || !!reduceData || cores <= 4 || mem <= 4
  const enabled =
    forced === '1' ? true : forced === '0' ? false : autoLowPower
  if (enabled) document.documentElement.classList.add('gs-low-power')
  // Optional debug hook (safe no-op in prod unless used)
  window.__GS_SET_LOW_POWER__ = (on) => {
    const v = on ? '1' : '0'
    window.localStorage?.setItem('gs:lowPower', v)
    document.documentElement.classList.toggle('gs-low-power', !!on)
  }
} catch {
  // ignore
}
const root = ReactDOM.createRoot(document.getElementById('root'))

// In local development we want routes to work at `/...` regardless of PUBLIC_URL/homepage.
// PUBLIC_URL is mainly useful for production deployments under a subpath (e.g. GitHub Pages).
const routerBaseName =
  process.env.NODE_ENV === 'production' ? process.env.PUBLIC_URL : '/'

root.render(
  <QueryClientProvider client={queryClient}>
    <Toaster 
    position="top-right"
    reverseOrder={false}
    gutter={8}
    toastOptions={{
      duration: 4000,
      style: {
        border: '1px solid #4A5073',
        color: '#4A5073',
        padding: '16px',
      }
    }}
    />
    <BrowserRouter basename={routerBaseName}>
       <MainRoute />
    </BrowserRouter>
    <ReactQueryDevtools initialIsOpen={false} position={'bottom-right'} />
  </QueryClientProvider>
)
