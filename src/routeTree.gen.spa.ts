/* eslint-disable */

// @ts-nocheck

// SPA route tree — excludes server-only routes (webhook API) and SSR registration

import { Route as rootRouteImport } from './routes/__root.spa'
import { Route as SupportRouteImport } from './routes/support'
import { Route as SignupRouteImport } from './routes/signup'
import { Route as SettingsRouteImport } from './routes/settings'
import { Route as ProfitRouteImport } from './routes/profit'
import { Route as PrivateRouteImport } from './routes/private'
import { Route as LoginRouteImport } from './routes/login'
import { Route as DashboardRouteImport } from './routes/dashboard'
import { Route as IndexRouteImport } from './routes/index'
import { Route as DashboardIndexRouteImport } from './routes/dashboard.index'
import { Route as DashboardReportsRouteImport } from './routes/dashboard.reports'
import { Route as DashboardManageRouteImport } from './routes/dashboard.manage'
import { Route as DashboardBlacklistRouteImport } from './routes/dashboard.blacklist'

const SupportRoute = SupportRouteImport.update({
  id: '/support',
  path: '/support',
  getParentRoute: () => rootRouteImport,
} as any)
const SignupRoute = SignupRouteImport.update({
  id: '/signup',
  path: '/signup',
  getParentRoute: () => rootRouteImport,
} as any)
const SettingsRoute = SettingsRouteImport.update({
  id: '/settings',
  path: '/settings',
  getParentRoute: () => rootRouteImport,
} as any)
const ProfitRoute = ProfitRouteImport.update({
  id: '/profit',
  path: '/profit',
  getParentRoute: () => rootRouteImport,
} as any)
const PrivateRoute = PrivateRouteImport.update({
  id: '/private',
  path: '/private',
  getParentRoute: () => rootRouteImport,
} as any)
const LoginRoute = LoginRouteImport.update({
  id: '/login',
  path: '/login',
  getParentRoute: () => rootRouteImport,
} as any)
const DashboardRoute = DashboardRouteImport.update({
  id: '/dashboard',
  path: '/dashboard',
  getParentRoute: () => rootRouteImport,
} as any)
const IndexRoute = IndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRouteImport,
} as any)
const DashboardIndexRoute = DashboardIndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => DashboardRoute,
} as any)
const DashboardReportsRoute = DashboardReportsRouteImport.update({
  id: '/reports',
  path: '/reports',
  getParentRoute: () => DashboardRoute,
} as any)
const DashboardManageRoute = DashboardManageRouteImport.update({
  id: '/manage',
  path: '/manage',
  getParentRoute: () => DashboardRoute,
} as any)
const DashboardBlacklistRoute = DashboardBlacklistRouteImport.update({
  id: '/blacklist',
  path: '/blacklist',
  getParentRoute: () => DashboardRoute,
} as any)

interface DashboardRouteChildren {
  DashboardBlacklistRoute: typeof DashboardBlacklistRoute
  DashboardManageRoute: typeof DashboardManageRoute
  DashboardReportsRoute: typeof DashboardReportsRoute
  DashboardIndexRoute: typeof DashboardIndexRoute
}

const DashboardRouteChildren: DashboardRouteChildren = {
  DashboardBlacklistRoute: DashboardBlacklistRoute,
  DashboardManageRoute: DashboardManageRoute,
  DashboardReportsRoute: DashboardReportsRoute,
  DashboardIndexRoute: DashboardIndexRoute,
}

const DashboardRouteWithChildren = DashboardRoute._addFileChildren(
  DashboardRouteChildren,
)

const rootRouteChildren = {
  IndexRoute: IndexRoute,
  DashboardRoute: DashboardRouteWithChildren,
  LoginRoute: LoginRoute,
  PrivateRoute: PrivateRoute,
  ProfitRoute: ProfitRoute,
  SettingsRoute: SettingsRoute,
  SignupRoute: SignupRoute,
  SupportRoute: SupportRoute,
}

export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
