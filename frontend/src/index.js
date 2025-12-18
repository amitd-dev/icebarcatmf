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
