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
    <BrowserRouter basename="/icebarcatmf">
       <MainRoute />
    </BrowserRouter>
    <ReactQueryDevtools initialIsOpen={false} position={'bottom-right'} />
  </QueryClientProvider>
)
