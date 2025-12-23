import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { Op, QueryTypes } from 'sequelize'
import timezone from 'dayjs/plugin/timezone'
import ServiceBase from '../../libs/serviceBase'
import redisClient from '../../libs/redisClient'
import { divide, minus, plus, round, times } from 'number-precision'
import { sequelize as database } from '../../db/models'
import { BONUS_TYPE, DASHBOARD_REPORT, JACKPOT_STATUS, TIMEZONES_WITH_DAYLIGHT_SAVINGS } from '../../utils/constants/constant'
import { transformBonusData } from '../../utils/common'

dayjs.extend(utc)
dayjs.extend(timezone)

export class DashboardReportService extends ServiceBase {
  async run () {
    const { playerType = 'all', reportType } = this.args

    const internalUsers = await this.internalUsersCache()

    const { startDate, endDate, todayStart, todayEnd, yesterdayStart, yesterdayEnd, startOfMonth, startOfLastMonth, endOfLastMonth } = this.calculateDates()

    // Dashboard Report
    if (reportType === DASHBOARD_REPORT.DASHBOARD_REPORT) {
      const { aggregatedEndDate, sumStartDate } = this.calculateDateTimeForAggregatedData(todayEnd)

      const [
        { scStakeSum, scWinSum, scAwardedTotal, gcAwardedTotal, jackpotRevenueTotal, redemptionSumTotal, purchaseSumTotal },
        { redemptionSum: overallRedemptionSum, purchaseSum: overallPurchaseSum },
        { directScStakeSum, directScWinSum, directScAwardedTotal, directGcAwardedTotal, totalJackpotRevenue, totalRedemptionSum, totalPurchaseSum },
        { loggedInUsers, activePlayers },
        { walletScCoin, vaultScCoin }
      ] = await Promise.all([
        this.getDashBoardReportCumulativeData(todayStart, aggregatedEndDate, playerType),
        this.getDashboardOverallCumulativeDate(new Date(0), aggregatedEndDate, playerType),
        this.getDashBoardReportLast1HourData(sumStartDate, todayEnd, internalUsers, playerType),
        this.getLoggedInAndActivePlayerCount(),
        this.getLiveScAndVaultScCount()
      ])

      const scStakedTodayCount = +round(+plus(+scStakeSum || 0, +directScStakeSum || 0), 2)
      const scWinTodayCount = +round(+plus(+scWinSum || 0, +directScWinSum || 0), 2)
      const scAwardedTotalSumForToday = +round(+plus(+scAwardedTotal || 0, +directScAwardedTotal || 0), 2)
      const gcAwardedTotalSumForToday = +round(+plus(+gcAwardedTotal || 0, +directGcAwardedTotal || 0), 2)
      const scGgr = +round(+minus(+scStakedTodayCount, +scWinTodayCount), 2)
      const jackpotRevenue = +round(+plus(+jackpotRevenueTotal || 0, +totalJackpotRevenue || 0), 2)
      const netScGgr = +round(+plus(+minus(+scGgr, +scAwardedTotalSumForToday), +jackpotRevenue), 2)
      const redemptionRateOverall = +round(+times(+divide(+plus(+overallRedemptionSum || 0, +totalRedemptionSum || 0), +plus(+overallPurchaseSum || 0, +totalPurchaseSum || 0)), 100), 2)
      const redemptionRateToday = +round(+times(+divide(+plus(+redemptionSumTotal || 0, +totalRedemptionSum || 0), +plus(+purchaseSumTotal || 0, +totalPurchaseSum || 0)), 100), 2)

      return {
        DASHBOARD_REPORT: {
          scStakedTodayCount,
          scWinTodayCount,
          scAwardedTotalSumForToday,
          gcAwardedTotalSumForToday,
          scGgr,
          netScGgr,
          jackpotRevenue,
          currentLogin: +loggedInUsers || 0,
          activePlayersCount: +activePlayers || 0,
          totalWalletScCoin: +walletScCoin || 0,
          totalVaultScCoin: +vaultScCoin || 0,
          redemptionRateOverall,
          redemptionRateToday
        }
      }
    }

    // Login Data
    if (reportType === DASHBOARD_REPORT.LOGIN_DATA) {
      const {
        todayUniqueLoginCount,
        todayLoginCount,
        yesterdayUniqueLoginCount,
        yesterdayLoginCount,
        mtdUniqueLoginCount,
        mtdLoginCount,
        lastMonthUniqueLoginCount,
        lastMonthLoginCount,
        selectedDateUniqueLoginCount,
        selectedDateLoginCount
      } = await this.getLoginCount(todayStart, todayEnd, yesterdayStart, yesterdayEnd, startOfMonth, startOfLastMonth, startDate, endDate, internalUsers, playerType)

      return {
        UNIQ_LOGIN: {
          TODAY: todayUniqueLoginCount,
          YESTERDAY: yesterdayUniqueLoginCount,
          MONTH_TO_DATE: mtdUniqueLoginCount,
          LAST_MONTH: lastMonthUniqueLoginCount,
          CUSTOM: selectedDateUniqueLoginCount
        },
        TOTAL_LOGIN: {
          TODAY: todayLoginCount,
          YESTERDAY: yesterdayLoginCount,
          MONTH_TO_DATE: mtdLoginCount,
          LAST_MONTH: lastMonthLoginCount,
          CUSTOM: selectedDateLoginCount
        }
      }
    }

    // Login Data Till Date
    if (reportType === DASHBOARD_REPORT.LOGIN_DATA_TILL_DATE) {
      const { uniqueLoginCountTillDate, loginCountTillDate } = await this.getTillDateLoginCount(internalUsers, playerType)

      return {
        UNIQ_LOGIN: uniqueLoginCountTillDate,
        TOTAL_LOGIN: loginCountTillDate
      }
    }

    // Customer Data
    if (reportType === DASHBOARD_REPORT.CUSTOMER_DATA) {
      const { aggregatedEndDate: cumulativeTodayEndDate, sumStartDate: sumTodayStartDate } = this.calculateDateTimeForAggregatedData(todayEnd)
      const { aggregatedEndDate: cumulativeYesterdayEndDate, sumStartDate: sumYesterdayStartDate } = this.calculateDateTimeForAggregatedData(yesterdayEnd)
      const { aggregatedEndDate: cumulativeLastMonthEndDate, sumStartDate: sumLastMonthStartDate } = this.calculateDateTimeForAggregatedData(endOfLastMonth)
      const { aggregatedEndDate: cumulativeEndDate, sumStartDate } = this.calculateDateTimeForAggregatedData(endDate)

      const [
        todayCumulativeData,
        yesterdayCumulativeData,
        monthToDateCumulativeData,
        lastMonthCumulativeData,
        selectedDateCumulativeData,
        tillDateCumulativeData,

        todayLastHourData,
        yesterdayLastHourData,
        lastMonthLastHourData,
        selectedDateLastHourData
      ] = await Promise.all([
        this.getCustomerReportCumulativeData(todayStart, cumulativeTodayEndDate, playerType),
        this.getCustomerReportCumulativeData(yesterdayStart, cumulativeYesterdayEndDate, playerType),
        this.getCustomerReportCumulativeData(startOfMonth, cumulativeTodayEndDate, playerType),
        this.getCustomerReportCumulativeData(startOfLastMonth, cumulativeLastMonthEndDate, playerType),
        this.getCustomerReportCumulativeData(startDate, cumulativeEndDate, playerType),
        this.getCustomerReportCumulativeData(new Date(0), cumulativeTodayEndDate, playerType),

        this.getCustomerReportLastHourData(sumTodayStartDate, todayEnd, playerType, internalUsers),
        this.getCustomerReportLastHourData(sumYesterdayStartDate, yesterdayEnd, playerType, internalUsers),
        this.getCustomerReportLastHourData(sumLastMonthStartDate, endOfLastMonth, playerType, internalUsers),
        this.getCustomerReportLastHourData(sumStartDate, endDate, playerType, internalUsers)
      ])

      return {
        NEW_REGISTRATION: {
          TODAY: +round(+plus(+todayCumulativeData.newRegisteredPlayer || 0, +todayLastHourData.newRegisteredPlayer || 0), 2),
          YESTERDAY: +round(+plus(+yesterdayCumulativeData.newRegisteredPlayer || 0, +yesterdayLastHourData.newRegisteredPlayer || 0), 2),
          MONTH_TO_DATE: +round(+plus(+monthToDateCumulativeData.newRegisteredPlayer || 0, +todayLastHourData.newRegisteredPlayer || 0), 2),
          LAST_MONTH: +round(+plus(+lastMonthCumulativeData.newRegisteredPlayer || 0, +lastMonthLastHourData.newRegisteredPlayer || 0), 2),
          CUSTOM: +round(+plus(+selectedDateCumulativeData.newRegisteredPlayer || 0, +selectedDateLastHourData.newRegisteredPlayer || 0), 2),
          TILL_DATE: +round(+plus(+tillDateCumulativeData.newRegisteredPlayer || 0, +todayLastHourData.newRegisteredPlayer || 0), 2)
        },
        FIRST_DEPOSIT_COUNT: {
          TODAY: +round(+plus(+todayCumulativeData.firstPurchaseCount || 0, +todayLastHourData.firstPurchaseCount || 0), 2),
          YESTERDAY: +round(+plus(+yesterdayCumulativeData.firstPurchaseCount || 0, +yesterdayLastHourData.firstPurchaseCount || 0), 2),
          MONTH_TO_DATE: +round(+plus(+monthToDateCumulativeData.firstPurchaseCount || 0, +todayLastHourData.firstPurchaseCount || 0), 2),
          LAST_MONTH: +round(+plus(+lastMonthCumulativeData.firstPurchaseCount || 0, +lastMonthLastHourData.firstPurchaseCount || 0), 2),
          CUSTOM: +round(+plus(+selectedDateCumulativeData.firstPurchaseCount || 0, +selectedDateLastHourData.firstPurchaseCount || 0), 2),
          TILL_DATE: +round(+plus(+tillDateCumulativeData.firstPurchaseCount || 0, +todayLastHourData.firstPurchaseCount || 0), 2)
        },
        FIRST_DEPOSIT_SUM: {
          TODAY: +round(+plus(+todayCumulativeData.firstPurchaseSum || 0, +todayLastHourData.firstPurchaseSum || 0), 2),
          YESTERDAY: +round(+plus(+yesterdayCumulativeData.firstPurchaseSum || 0, +yesterdayLastHourData.firstPurchaseSum || 0), 2),
          MONTH_TO_DATE: +round(+plus(+monthToDateCumulativeData.firstPurchaseSum || 0, +todayLastHourData.firstPurchaseSum || 0), 2),
          LAST_MONTH: +round(+plus(+lastMonthCumulativeData.firstPurchaseSum || 0, +lastMonthLastHourData.firstPurchaseSum || 0), 2),
          CUSTOM: +round(+plus(+selectedDateCumulativeData.firstPurchaseSum || 0, +selectedDateLastHourData.firstPurchaseSum || 0), 2),
          TILL_DATE: +round(+plus(+tillDateCumulativeData.firstPurchaseSum || 0, +todayLastHourData.firstPurchaseSum || 0), 2)
        },
        PURCHASE_COUNT: {
          TODAY: +round(+plus(+todayCumulativeData.purchaseCount || 0, +todayLastHourData.purchaseCount || 0), 2),
          YESTERDAY: +round(+plus(+yesterdayCumulativeData.purchaseCount || 0, +yesterdayLastHourData.purchaseCount || 0), 2),
          MONTH_TO_DATE: +round(+plus(+monthToDateCumulativeData.purchaseCount || 0, +todayLastHourData.purchaseCount || 0), 2),
          LAST_MONTH: +round(+plus(+lastMonthCumulativeData.purchaseCount || 0, +lastMonthLastHourData.purchaseCount || 0), 2),
          CUSTOM: +round(+plus(+selectedDateCumulativeData.purchaseCount || 0, +selectedDateLastHourData.purchaseCount || 0), 2),
          TILL_DATE: +round(+plus(+tillDateCumulativeData.purchaseCount || 0, +todayLastHourData.purchaseCount || 0), 2)
        },
        PURCHASE_SUM: {
          TODAY: +round(+plus(+todayCumulativeData.purchaseSum || 0, +todayLastHourData.purchaseSum || 0), 2),
          YESTERDAY: +round(+plus(+yesterdayCumulativeData.purchaseSum || 0, +yesterdayLastHourData.purchaseSum || 0), 2),
          MONTH_TO_DATE: +round(+plus(+monthToDateCumulativeData.purchaseSum || 0, +todayLastHourData.purchaseSum || 0), 2),
          LAST_MONTH: +round(+plus(+lastMonthCumulativeData.purchaseSum || 0, +lastMonthLastHourData.purchaseSum || 0), 2),
          CUSTOM: +round(+plus(+selectedDateCumulativeData.purchaseSum || 0, +selectedDateLastHourData.purchaseSum || 0), 2),
          TILL_DATE: +round(+plus(+tillDateCumulativeData.purchaseSum || 0, +todayLastHourData.purchaseSum || 0), 2)
        },
        AVERAGE_PURCHASE_AMOUNT: {
          TODAY: +round(+divide(+round(+plus(+todayCumulativeData.purchaseSum || 0, +todayLastHourData.purchaseSum || 0), 2), +round(+plus(+todayCumulativeData.purchaseCount || 0, +todayLastHourData.purchaseCount || 0), 2) || 0), 2) || 0,
          YESTERDAY: +round(+divide(+round(+plus(+yesterdayCumulativeData.purchaseSum || 0, +yesterdayLastHourData.purchaseSum || 0), 2), +round(+plus(+yesterdayCumulativeData.purchaseCount || 0, +yesterdayLastHourData.purchaseCount || 0), 2) || 0), 2) || 0,
          MONTH_TO_DATE: +round(+divide(+round(+plus(+monthToDateCumulativeData.purchaseSum || 0, +todayLastHourData.purchaseSum || 0), 2), +round(+plus(+monthToDateCumulativeData.purchaseCount || 0, +todayLastHourData.purchaseCount || 0), 2) || 0), 2) || 0,
          LAST_MONTH: +round(+divide(+round(+plus(+lastMonthCumulativeData.purchaseSum || 0, +lastMonthLastHourData.purchaseSum || 0), 2), +round(+plus(+lastMonthCumulativeData.purchaseCount || 0, +lastMonthLastHourData.purchaseCount || 0), 2) || 0), 2) || 0,
          CUSTOM: +round(+divide(+round(+plus(+selectedDateCumulativeData.purchaseSum || 0, +selectedDateLastHourData.purchaseSum || 0), 2), +round(+plus(+selectedDateCumulativeData.purchaseCount || 0, +selectedDateLastHourData.purchaseCount || 0), 2) || 0), 2) || 0,
          TILL_DATE: +round(+divide(+round(+plus(+tillDateCumulativeData.purchaseSum || 0, +todayLastHourData.purchaseSum || 0), 2), +round(+plus(+tillDateCumulativeData.purchaseCount || 0, +todayLastHourData.purchaseCount || 0), 2) || 0), 2) || 0
        },
        REQUESTED_REDEMPTION_COUNT: {
          TODAY: +round(+plus(+todayCumulativeData.requestRedemptionCount || 0, +todayLastHourData.requestRedemptionCount || 0), 2),
          YESTERDAY: +round(+plus(+yesterdayCumulativeData.requestRedemptionCount || 0, +yesterdayLastHourData.requestRedemptionCount || 0), 2),
          MONTH_TO_DATE: +round(+plus(+monthToDateCumulativeData.requestRedemptionCount || 0, +todayLastHourData.requestRedemptionCount || 0), 2),
          LAST_MONTH: +round(+plus(+lastMonthCumulativeData.requestRedemptionCount || 0, +lastMonthLastHourData.requestRedemptionCount || 0), 2),
          CUSTOM: +round(+plus(+selectedDateCumulativeData.requestRedemptionCount || 0, +selectedDateLastHourData.requestRedemptionCount || 0), 2),
          TILL_DATE: +round(+plus(+tillDateCumulativeData.requestRedemptionCount || 0, +todayLastHourData.requestRedemptionCount || 0), 2)
        },
        PENDING_REDEMPTION_COUNT: {
          TODAY: +round(+plus(+todayCumulativeData.pendingRedemptionCount || 0, +todayLastHourData.pendingRedemptionCount || 0), 2),
          YESTERDAY: +round(+plus(+yesterdayCumulativeData.pendingRedemptionCount || 0, +yesterdayLastHourData.pendingRedemptionCount || 0), 2),
          MONTH_TO_DATE: +round(+plus(+monthToDateCumulativeData.pendingRedemptionCount || 0, +todayLastHourData.pendingRedemptionCount || 0), 2),
          LAST_MONTH: +round(+plus(+lastMonthCumulativeData.pendingRedemptionCount || 0, +lastMonthLastHourData.pendingRedemptionCount || 0), 2),
          CUSTOM: +round(+plus(+selectedDateCumulativeData.pendingRedemptionCount || 0, +selectedDateLastHourData.pendingRedemptionCount || 0), 2),
          TILL_DATE: +round(+plus(+tillDateCumulativeData.pendingRedemptionCount || 0, +todayLastHourData.pendingRedemptionCount || 0), 2)
        },
        APPROVAL_REDEMPTION_COUNT: {
          TODAY: +round(+plus(+todayCumulativeData.approvedRedemptionCount || 0, +todayLastHourData.approvedRedemptionCount || 0), 2),
          YESTERDAY: +round(+plus(+yesterdayCumulativeData.approvedRedemptionCount || 0, +yesterdayLastHourData.approvedRedemptionCount || 0), 2),
          MONTH_TO_DATE: +round(+plus(+monthToDateCumulativeData.approvedRedemptionCount || 0, +todayLastHourData.approvedRedemptionCount || 0), 2),
          LAST_MONTH: +round(+plus(+lastMonthCumulativeData.approvedRedemptionCount || 0, +lastMonthLastHourData.approvedRedemptionCount || 0), 2),
          CUSTOM: +round(+plus(+selectedDateCumulativeData.approvedRedemptionCount || 0, +selectedDateLastHourData.approvedRedemptionCount || 0), 2),
          TILL_DATE: +round(+plus(+tillDateCumulativeData.approvedRedemptionCount || 0, +todayLastHourData.approvedRedemptionCount || 0), 2)
        },
        CANCELLED_REDEMPTION_COUNT: {
          TODAY: +round(+plus(+todayCumulativeData.cancelledRedemptionCount || 0, +todayLastHourData.cancelledRedemptionCount || 0), 2),
          YESTERDAY: +round(+plus(+yesterdayCumulativeData.cancelledRedemptionCount || 0, +yesterdayLastHourData.cancelledRedemptionCount || 0), 2),
          MONTH_TO_DATE: +round(+plus(+monthToDateCumulativeData.cancelledRedemptionCount || 0, +todayLastHourData.cancelledRedemptionCount || 0), 2),
          LAST_MONTH: +round(+plus(+lastMonthCumulativeData.cancelledRedemptionCount || 0, +lastMonthLastHourData.cancelledRedemptionCount || 0), 2),
          CUSTOM: +round(+plus(+selectedDateCumulativeData.cancelledRedemptionCount || 0, +selectedDateLastHourData.cancelledRedemptionCount || 0), 2),
          TILL_DATE: +round(+plus(+tillDateCumulativeData.cancelledRedemptionCount || 0, +todayLastHourData.cancelledRedemptionCount || 0), 2)
        },
        FAILED_REDEMPTION_COUNT: {
          TODAY: +round(+plus(+todayCumulativeData.failedRedemptionCount || 0, +todayLastHourData.failedRedemptionCount || 0), 2),
          YESTERDAY: +round(+plus(+yesterdayCumulativeData.failedRedemptionCount || 0, +yesterdayLastHourData.failedRedemptionCount || 0), 2),
          MONTH_TO_DATE: +round(+plus(+monthToDateCumulativeData.failedRedemptionCount || 0, +todayLastHourData.failedRedemptionCount || 0), 2),
          LAST_MONTH: +round(+plus(+lastMonthCumulativeData.failedRedemptionCount || 0, +lastMonthLastHourData.failedRedemptionCount || 0), 2),
          CUSTOM: +round(+plus(+selectedDateCumulativeData.failedRedemptionCount || 0, +selectedDateLastHourData.failedRedemptionCount || 0), 2),
          TILL_DATE: +round(+plus(+tillDateCumulativeData.failedRedemptionCount || 0, +todayLastHourData.failedRedemptionCount || 0), 2)
        },
        REQUESTED_REDEMPTION_SUM: {
          TODAY: +round(+plus(+todayCumulativeData.requestRedemptionSum || 0, +todayLastHourData.requestRedemptionSum || 0), 2),
          YESTERDAY: +round(+plus(+yesterdayCumulativeData.requestRedemptionSum || 0, +yesterdayLastHourData.requestRedemptionSum || 0), 2),
          MONTH_TO_DATE: +round(+plus(+monthToDateCumulativeData.requestRedemptionSum || 0, +todayLastHourData.requestRedemptionSum || 0), 2),
          LAST_MONTH: +round(+plus(+lastMonthCumulativeData.requestRedemptionSum || 0, +lastMonthLastHourData.requestRedemptionSum || 0), 2),
          CUSTOM: +round(+plus(+selectedDateCumulativeData.requestRedemptionSum || 0, +selectedDateLastHourData.requestRedemptionSum || 0), 2),
          TILL_DATE: +round(+plus(+tillDateCumulativeData.requestRedemptionSum || 0, +todayLastHourData.requestRedemptionSum || 0), 2)
        },
        PENDING_REDEMPTION_SUM: {
          TODAY: +round(+plus(+todayCumulativeData.pendingRedemptionAmount || 0, +todayLastHourData.pendingRedemptionSum || 0), 2),
          YESTERDAY: +round(+plus(+yesterdayCumulativeData.pendingRedemptionAmount || 0, +yesterdayLastHourData.pendingRedemptionSum || 0), 2),
          MONTH_TO_DATE: +round(+plus(+monthToDateCumulativeData.pendingRedemptionAmount || 0, +todayLastHourData.pendingRedemptionSum || 0), 2),
          LAST_MONTH: +round(+plus(+lastMonthCumulativeData.pendingRedemptionAmount || 0, +lastMonthLastHourData.pendingRedemptionSum || 0), 2),
          CUSTOM: +round(+plus(+selectedDateCumulativeData.pendingRedemptionAmount || 0, +selectedDateLastHourData.pendingRedemptionSum || 0), 2),
          TILL_DATE: +round(+plus(+tillDateCumulativeData.pendingRedemptionAmount || 0, +todayLastHourData.pendingRedemptionSum || 0), 2)
        },
        APPROVAL_REDEMPTION_SUM: {
          TODAY: +round(+plus(+todayCumulativeData.approvedRedemptionSum || 0, +todayLastHourData.approvedRedemptionSum || 0), 2),
          YESTERDAY: +round(+plus(+yesterdayCumulativeData.approvedRedemptionSum || 0, +yesterdayLastHourData.approvedRedemptionSum || 0), 2),
          MONTH_TO_DATE: +round(+plus(+monthToDateCumulativeData.approvedRedemptionSum || 0, +todayLastHourData.approvedRedemptionSum || 0), 2),
          LAST_MONTH: +round(+plus(+lastMonthCumulativeData.approvedRedemptionSum || 0, +lastMonthLastHourData.approvedRedemptionSum || 0), 2),
          CUSTOM: +round(+plus(+selectedDateCumulativeData.approvedRedemptionSum || 0, +selectedDateLastHourData.approvedRedemptionSum || 0), 2),
          TILL_DATE: +round(+plus(+tillDateCumulativeData.approvedRedemptionSum || 0, +todayLastHourData.approvedRedemptionSum || 0), 2)
        },
        CANCELLED_REDEMPTION_SUM: {
          TODAY: +round(+plus(+todayCumulativeData.cancelledRedemptionSum || 0, +todayLastHourData.cancelledRedemptionSum || 0), 2),
          YESTERDAY: +round(+plus(+yesterdayCumulativeData.cancelledRedemptionSum || 0, +yesterdayLastHourData.cancelledRedemptionSum || 0), 2),
          MONTH_TO_DATE: +round(+plus(+monthToDateCumulativeData.cancelledRedemptionSum || 0, +todayLastHourData.cancelledRedemptionSum || 0), 2),
          LAST_MONTH: +round(+plus(+lastMonthCumulativeData.cancelledRedemptionSum || 0, +lastMonthLastHourData.cancelledRedemptionSum || 0), 2),
          CUSTOM: +round(+plus(+selectedDateCumulativeData.cancelledRedemptionSum || 0, +selectedDateLastHourData.cancelledRedemptionSum || 0), 2),
          TILL_DATE: +round(+plus(+tillDateCumulativeData.cancelledRedemptionSum || 0, +todayLastHourData.cancelledRedemptionSum || 0), 2)
        },
        FAILED_REDEMPTION_SUM: {
          TODAY: +round(+plus(+todayCumulativeData.failedRedemptionAmount || 0, +todayLastHourData.failedRedemptionSum || 0), 2),
          YESTERDAY: +round(+plus(+yesterdayCumulativeData.failedRedemptionAmount || 0, +yesterdayLastHourData.failedRedemptionSum || 0), 2),
          MONTH_TO_DATE: +round(+plus(+monthToDateCumulativeData.failedRedemptionAmount || 0, +todayLastHourData.failedRedemptionSum || 0), 2),
          LAST_MONTH: +round(+plus(+lastMonthCumulativeData.failedRedemptionAmount || 0, +lastMonthLastHourData.failedRedemptionSum || 0), 2),
          CUSTOM: +round(+plus(+selectedDateCumulativeData.failedRedemptionAmount || 0, +selectedDateLastHourData.failedRedemptionSum || 0), 2),
          TILL_DATE: +round(+plus(+tillDateCumulativeData.failedRedemptionAmount || 0, +todayLastHourData.failedRedemptionSum || 0), 2)
        },
        NET_REVENUE: {
          TODAY: +round(+minus(
            +round(+plus(+todayCumulativeData.purchaseSum || 0, +todayLastHourData.purchaseSum || 0), 2), // Purchase
            +round(+plus(
              +round(+plus(+todayCumulativeData.pendingRedemptionAmount || 0, +todayLastHourData.pendingRedemptionSum || 0), 2), // Pending Redemption
              +round(+plus(+todayCumulativeData.approvedRedemptionSum || 0, +todayLastHourData.approvedRedemptionSum || 0), 2) // Approved Redemption
            ), 2)
          ), 2),
          YESTERDAY: +round(+minus(
            +round(+plus(+yesterdayCumulativeData.purchaseSum || 0, +yesterdayLastHourData.purchaseSum || 0), 2),
            +round(+plus(
              +round(+plus(+yesterdayCumulativeData.pendingRedemptionAmount || 0, +yesterdayLastHourData.pendingRedemptionSum || 0), 2),
              +round(+plus(+yesterdayCumulativeData.approvedRedemptionSum || 0, +yesterdayLastHourData.approvedRedemptionSum || 0), 2)
            ), 2)
          ), 2),
          MONTH_TO_DATE: +round(+minus(
            +round(+plus(+monthToDateCumulativeData.purchaseSum || 0, +todayLastHourData.purchaseSum || 0), 2),
            +round(+plus(
              +round(+plus(+monthToDateCumulativeData.pendingRedemptionAmount || 0, +todayLastHourData.pendingRedemptionSum || 0), 2),
              +round(+plus(+monthToDateCumulativeData.approvedRedemptionSum || 0, +todayLastHourData.approvedRedemptionSum || 0), 2)
            ), 2)
          ), 2),
          LAST_MONTH: +round(+minus(
            +round(+plus(+lastMonthCumulativeData.purchaseSum || 0, +lastMonthLastHourData.purchaseSum || 0), 2),
            +round(+plus(
              +round(+plus(+lastMonthCumulativeData.pendingRedemptionAmount || 0, +lastMonthLastHourData.pendingRedemptionSum || 0), 2),
              +round(+plus(+lastMonthCumulativeData.approvedRedemptionSum || 0, +lastMonthLastHourData.approvedRedemptionSum || 0), 2)
            ), 2)
          ), 2),
          CUSTOM: +round(+minus(
            +round(+plus(+selectedDateCumulativeData.purchaseSum || 0, +selectedDateLastHourData.purchaseSum || 0), 2),
            +round(+plus(
              +round(+plus(+selectedDateCumulativeData.pendingRedemptionAmount || 0, +selectedDateLastHourData.pendingRedemptionSum || 0), 2),
              +round(+plus(+selectedDateCumulativeData.approvedRedemptionSum || 0, +selectedDateLastHourData.approvedRedemptionSum || 0), 2)
            ), 2)
          ), 2),
          TILL_DATE: +round(+minus(
            +round(+plus(+tillDateCumulativeData.purchaseSum || 0, +todayLastHourData.purchaseSum || 0), 2),
            +round(+plus(
              +round(+plus(+tillDateCumulativeData.pendingRedemptionAmount || 0, +todayLastHourData.pendingRedemptionSum || 0), 2),
              +round(+plus(+tillDateCumulativeData.approvedRedemptionSum || 0, +todayLastHourData.approvedRedemptionSum || 0), 2)
            ), 2)
          ), 2)
        }
      }
    }

    // Coin Economy Data
    if (reportType === DASHBOARD_REPORT.ECONOMY_DATA) {
      const { aggregatedEndDate: cumulativeTodayEndDate, sumStartDate: sumTodayStartDate } = this.calculateDateTimeForAggregatedData(todayEnd)
      const { aggregatedEndDate: cumulativeYesterdayEndDate, sumStartDate: sumYesterdayStartDate } = this.calculateDateTimeForAggregatedData(yesterdayEnd)
      const { aggregatedEndDate: cumulativeLastMonthEndDate, sumStartDate: sumLastMonthStartDate } = this.calculateDateTimeForAggregatedData(endOfLastMonth)
      const { aggregatedEndDate: cumulativeEndDate, sumStartDate } = this.calculateDateTimeForAggregatedData(endDate)

      const [
        todayCumulativeData,
        yesterdayCumulativeData,
        monthToDateCumulativeData,
        lastMonthCumulativeData,
        selectedDateCumulativeData,
        tillDateCumulativeData,

        todayLastHourData,
        yesterdayLastHourData,
        lastMonthLastHourData,
        selectedDateLastHourData
      ] = await Promise.all([
        this.getCoinEconomyCumulativeData(todayStart, cumulativeTodayEndDate, playerType),
        this.getCoinEconomyCumulativeData(yesterdayStart, cumulativeYesterdayEndDate, playerType),
        this.getCoinEconomyCumulativeData(startOfMonth, cumulativeTodayEndDate, playerType),
        this.getCoinEconomyCumulativeData(startOfLastMonth, cumulativeLastMonthEndDate, playerType),
        this.getCoinEconomyCumulativeData(startDate, cumulativeEndDate, playerType),
        this.getCoinEconomyCumulativeData(new Date(0), cumulativeTodayEndDate, playerType),

        this.getCoinEconomyCumulativeLastHourData(sumTodayStartDate, todayEnd, playerType, internalUsers),
        this.getCoinEconomyCumulativeLastHourData(sumYesterdayStartDate, yesterdayEnd, playerType, internalUsers),
        this.getCoinEconomyCumulativeLastHourData(sumLastMonthStartDate, endOfLastMonth, playerType, internalUsers),
        this.getCoinEconomyCumulativeLastHourData(sumStartDate, endDate, playerType, internalUsers)
      ])

      return {
        GC_CREDITED_PURCHASE: {
          TODAY: +round(+plus(+todayCumulativeData.gcCreditPurchaseSum || 0, +todayLastHourData.gcCreditPurchaseSum || 0), 2),
          YESTERDAY: +round(+plus(+yesterdayCumulativeData.gcCreditPurchaseSum || 0, +yesterdayLastHourData.gcCreditPurchaseSum || 0), 2),
          MONTH_TO_DATE: +round(+plus(+monthToDateCumulativeData.gcCreditPurchaseSum || 0, +todayLastHourData.gcCreditPurchaseSum || 0), 2),
          LAST_MONTH: +round(+plus(+lastMonthCumulativeData.gcCreditPurchaseSum || 0, +lastMonthLastHourData.gcCreditPurchaseSum || 0), 2),
          CUSTOM: +round(+plus(+selectedDateCumulativeData.gcCreditPurchaseSum || 0, +selectedDateLastHourData.gcCreditPurchaseSum || 0), 2),
          TILL_DATE: +round(+plus(+tillDateCumulativeData.gcCreditPurchaseSum || 0, +todayLastHourData.gcCreditPurchaseSum || 0), 2)
        },
        SC_CREDITED_PURCHASE: {
          TODAY: +round(+plus(+todayCumulativeData.scCreditPurchaseSum || 0, +todayLastHourData.scCreditPurchaseSum || 0), 2),
          YESTERDAY: +round(+plus(+yesterdayCumulativeData.scCreditPurchaseSum || 0, +yesterdayLastHourData.scCreditPurchaseSum || 0), 2),
          MONTH_TO_DATE: +round(+plus(+monthToDateCumulativeData.scCreditPurchaseSum || 0, +todayLastHourData.scCreditPurchaseSum || 0), 2),
          LAST_MONTH: +round(+plus(+lastMonthCumulativeData.scCreditPurchaseSum || 0, +lastMonthLastHourData.scCreditPurchaseSum || 0), 2),
          CUSTOM: +round(+plus(+selectedDateCumulativeData.scCreditPurchaseSum || 0, +selectedDateLastHourData.scCreditPurchaseSum || 0), 2),
          TILL_DATE: +round(+plus(+tillDateCumulativeData.scCreditPurchaseSum || 0, +todayLastHourData.scCreditPurchaseSum || 0), 2)
        },
        GC_AWARDED_TOTAL: {
          TODAY: +round(+plus(+todayCumulativeData.gcAwardedAmountSum || 0, +todayLastHourData.gcAwardedAmountSum || 0), 2),
          YESTERDAY: +round(+plus(+yesterdayCumulativeData.gcAwardedAmountSum || 0, +yesterdayLastHourData.gcAwardedAmountSum || 0), 2),
          MONTH_TO_DATE: +round(+plus(+monthToDateCumulativeData.gcAwardedAmountSum || 0, +todayLastHourData.gcAwardedAmountSum || 0), 2),
          LAST_MONTH: +round(+plus(+lastMonthCumulativeData.gcAwardedAmountSum || 0, +lastMonthLastHourData.gcAwardedAmountSum || 0), 2),
          CUSTOM: +round(+plus(+selectedDateCumulativeData.gcAwardedAmountSum || 0, +selectedDateLastHourData.gcAwardedAmountSum || 0), 2),
          TILL_DATE: +round(+plus(+tillDateCumulativeData.gcAwardedAmountSum || 0, +todayLastHourData.gcAwardedAmountSum || 0), 2)
        },
        SC_AWARDED_TOTAL: {
          TODAY: +round(+plus(+todayCumulativeData.scAwardedAmountSum || 0, +todayLastHourData.scAwardedAmountSum || 0), 2),
          YESTERDAY: +round(+plus(+yesterdayCumulativeData.scAwardedAmountSum || 0, +yesterdayLastHourData.scAwardedAmountSum || 0), 2),
          MONTH_TO_DATE: +round(+plus(+monthToDateCumulativeData.scAwardedAmountSum || 0, +todayLastHourData.scAwardedAmountSum || 0), 2),
          LAST_MONTH: +round(+plus(+lastMonthCumulativeData.scAwardedAmountSum || 0, +lastMonthLastHourData.scAwardedAmountSum || 0), 2),
          CUSTOM: +round(+plus(+selectedDateCumulativeData.scAwardedAmountSum || 0, +selectedDateLastHourData.scAwardedAmountSum || 0), 2),
          TILL_DATE: +round(+plus(+tillDateCumulativeData.scAwardedAmountSum || 0, +todayLastHourData.scAwardedAmountSum || 0), 2)
        }
      }
    }

    // Transaction Data
    if (reportType === DASHBOARD_REPORT.TRANSACTION_DATA) {
      const { aggregatedEndDate: cumulativeTodayEndDate, sumStartDate: sumTodayStartDate } = this.calculateDateTimeForAggregatedData(todayEnd)
      const { aggregatedEndDate: cumulativeYesterdayEndDate, sumStartDate: sumYesterdayStartDate } = this.calculateDateTimeForAggregatedData(yesterdayEnd)
      const { aggregatedEndDate: cumulativeLastMonthEndDate, sumStartDate: sumLastMonthStartDate } = this.calculateDateTimeForAggregatedData(endOfLastMonth)
      const { aggregatedEndDate: cumulativeEndDate, sumStartDate } = this.calculateDateTimeForAggregatedData(endDate)

      const [
        todayCumulativeData,
        yesterdayCumulativeData,
        monthToDateCumulativeData,
        lastMonthCumulativeData,
        selectedDateCumulativeData,
        tillDateCumulativeData,

        todayLastHourData,
        yesterdayLastHourData,
        lastMonthLastHourData,
        selectedDateLastHourData
      ] = await Promise.all([
        this.getTransactionCumulativeData(todayStart, cumulativeTodayEndDate, playerType),
        this.getTransactionCumulativeData(yesterdayStart, cumulativeYesterdayEndDate, playerType),
        this.getTransactionCumulativeData(startOfMonth, cumulativeTodayEndDate, playerType),
        this.getTransactionCumulativeData(startOfLastMonth, cumulativeLastMonthEndDate, playerType),
        this.getTransactionCumulativeData(startDate, cumulativeEndDate, playerType),
        this.getTransactionCumulativeData(new Date(0), cumulativeTodayEndDate, playerType),

        this.getTransactionCumulativeLastHourData(sumTodayStartDate, todayEnd, playerType, internalUsers),
        this.getTransactionCumulativeLastHourData(sumYesterdayStartDate, yesterdayEnd, playerType, internalUsers),
        this.getTransactionCumulativeLastHourData(sumLastMonthStartDate, endOfLastMonth, playerType, internalUsers),
        this.getTransactionCumulativeLastHourData(sumStartDate, endDate, playerType, internalUsers)
      ])

      const todaySCStakedSum = +round(+plus(+todayCumulativeData.scStakedSum || 0, +todayLastHourData.scStakedSum || 0), 2)
      const todaySCWinSum = +round(+plus(+todayCumulativeData.scWinSum || 0, +todayLastHourData.scWinSum || 0), 2)
      const yesterdaySCStakedSum = +round(+plus(+yesterdayCumulativeData.scStakedSum || 0, +yesterdayLastHourData.scStakedSum || 0), 2)
      const yesterdaySCWinSum = +round(+plus(+yesterdayCumulativeData.scWinSum || 0, +yesterdayLastHourData.scWinSum || 0), 2)
      const monthToDateSCStakedSum = +round(+plus(+monthToDateCumulativeData.scStakedSum || 0, +todayLastHourData.scStakedSum || 0), 2)
      const monthToDateSCWinSum = +round(+plus(+monthToDateCumulativeData.scWinSum || 0, +todayLastHourData.scWinSum || 0), 2)
      const lastMonthSCStakedSum = +round(+plus(+lastMonthCumulativeData.scStakedSum || 0, +lastMonthLastHourData.scStakedSum || 0), 2)
      const lastMonthSCWinSum = +round(+plus(+lastMonthCumulativeData.scWinSum || 0, +lastMonthLastHourData.scWinSum || 0), 2)
      const selectedDateSCStakedSum = +round(+plus(+selectedDateCumulativeData.scStakedSum || 0, +selectedDateLastHourData.scStakedSum || 0), 2)
      const selectedDateSCWinSum = +round(+plus(+selectedDateCumulativeData.scWinSum || 0, +selectedDateLastHourData.scWinSum || 0), 2)
      const tillDateSCStakedSum = +round(+plus(+tillDateCumulativeData.scStakedSum || 0, +todayLastHourData.scStakedSum || 0), 2)
      const tillDateSCWinSum = +round(+plus(+tillDateCumulativeData.scWinSum || 0, +todayLastHourData.scWinSum || 0), 2)

      return {
        JACKPOT_REVENUE: {
          TODAY: +round(+plus(+todayCumulativeData.jackpotRevenue || 0, +todayLastHourData?.jackpotRevenue || 0), 2),
          YESTERDAY: +round(+plus(+yesterdayCumulativeData.jackpotRevenue || 0, +yesterdayLastHourData?.jackpotRevenue || 0), 2),
          MONTH_TO_DATE: +round(+plus(+monthToDateCumulativeData.jackpotRevenue || 0, +todayLastHourData?.jackpotRevenue || 0), 2),
          LAST_MONTH: +round(+plus(+lastMonthCumulativeData.jackpotRevenue || 0, +lastMonthLastHourData?.jackpotRevenue || 0), 2),
          CUSTOM: +round(+plus(+selectedDateCumulativeData.jackpotRevenue || 0, +selectedDateLastHourData?.jackpotRevenue || 0), 2),
          TILL_DATE: +round(+plus(+tillDateCumulativeData.jackpotRevenue || 0, +todayLastHourData?.jackpotRevenue || 0), 2)
        },
        SC_STAKED_TOTAL: {
          TODAY: +todaySCStakedSum || 0,
          YESTERDAY: +yesterdaySCStakedSum || 0,
          MONTH_TO_DATE: +monthToDateSCStakedSum || 0,
          LAST_MONTH: +lastMonthSCStakedSum || 0,
          CUSTOM: +selectedDateSCStakedSum || 0,
          TILL_DATE: +tillDateSCStakedSum || 0
        },
        SC_WIN_TOTAL: {
          TODAY: +todaySCWinSum || 0,
          YESTERDAY: +yesterdaySCWinSum || 0,
          MONTH_TO_DATE: +monthToDateSCWinSum || 0,
          LAST_MONTH: +lastMonthSCWinSum || 0,
          CUSTOM: +selectedDateSCWinSum || 0,
          TILL_DATE: +tillDateSCWinSum || 0
        },
        SC_GGR_TOTAL: {
          TODAY: +round(+minus(+todaySCStakedSum || 0, +todaySCWinSum || 0), 2),
          YESTERDAY: +round(+minus(+yesterdaySCStakedSum || 0, +yesterdaySCWinSum || 0), 2),
          MONTH_TO_DATE: +round(+minus(+monthToDateSCStakedSum || 0, +monthToDateSCWinSum || 0), 2),
          LAST_MONTH: +round(+minus(+lastMonthSCStakedSum || 0, +lastMonthSCWinSum || 0), 2),
          CUSTOM: +round(+minus(+selectedDateSCStakedSum || 0, +selectedDateSCWinSum || 0), 2),
          TILL_DATE: +round(+minus(+tillDateSCStakedSum || 0, +tillDateSCWinSum || 0), 2)
        },
        HOUSE_EDGE: {
          TODAY: +round(+minus(100, +todaySCStakedSum > 0 ? +round(+divide(+todaySCWinSum || 0, +todaySCStakedSum || 0) * 100, 2) : 0), 2),
          YESTERDAY: +round(+minus(100, +yesterdaySCStakedSum > 0 ? +round(+divide(+yesterdaySCWinSum || 0, +yesterdaySCStakedSum || 0) * 100, 2) : 0), 2),
          MONTH_TO_DATE: +round(+minus(100, +monthToDateSCStakedSum > 0 ? +round(+divide(+monthToDateSCWinSum || 0, +monthToDateSCStakedSum || 0) * 100, 2) : 0), 2),
          LAST_MONTH: +round(+minus(100, +lastMonthSCStakedSum > 0 ? +round(+divide(+lastMonthSCWinSum || 0, +lastMonthSCStakedSum || 0) * 100, 2) : 0), 2),
          CUSTOM: +round(+minus(100, +selectedDateSCStakedSum > 0 ? +round(+divide(+selectedDateSCWinSum || 0, +selectedDateSCStakedSum || 0) * 100, 2) : 0), 2),
          TILL_DATE: +round(+minus(100, +tillDateSCStakedSum > 0 ? +round(+divide(+tillDateSCWinSum || 0, +tillDateSCStakedSum || 0) * 100, 2) : 0), 2)
        }
      }
    }

    // Bonus Distribution Data
    if (reportType === DASHBOARD_REPORT.BONUS_DATA) {
      const { aggregatedEndDate: cumulativeTodayEndDate, sumStartDate: sumTodayStartDate } = this.calculateDateTimeForAggregatedData(todayEnd)
      const { aggregatedEndDate: cumulativeYesterdayEndDate, sumStartDate: sumYesterdayStartDate } = this.calculateDateTimeForAggregatedData(yesterdayEnd)
      const { aggregatedEndDate: cumulativeLastMonthEndDate, sumStartDate: sumLastMonthStartDate } = this.calculateDateTimeForAggregatedData(endOfLastMonth)
      const { aggregatedEndDate: cumulativeEndDate, sumStartDate } = this.calculateDateTimeForAggregatedData(endDate)

      const [
        todayCumulativeData,
        yesterdayCumulativeData,
        monthToDateCumulativeData,
        lastMonthCumulativeData,
        selectedDateCumulativeData,
        tillDateCumulativeData,

        todayLastHourData,
        yesterdayLastHourData,
        lastMonthLastHourData,
        selectedDateLastHourData
      ] = await Promise.all([
        this.getBonusesCumulativeData(todayStart, cumulativeTodayEndDate),
        this.getBonusesCumulativeData(yesterdayStart, cumulativeYesterdayEndDate),
        this.getBonusesCumulativeData(startOfMonth, cumulativeTodayEndDate),
        this.getBonusesCumulativeData(startOfLastMonth, cumulativeLastMonthEndDate),
        this.getBonusesCumulativeData(startDate, cumulativeEndDate),
        this.getBonusesCumulativeData(new Date(0), cumulativeTodayEndDate),

        this.getBonusesReportCumulativeLastHourData(sumTodayStartDate, todayEnd, playerType, internalUsers),
        this.getBonusesReportCumulativeLastHourData(sumYesterdayStartDate, yesterdayEnd, playerType, internalUsers),
        this.getBonusesReportCumulativeLastHourData(sumLastMonthStartDate, endOfLastMonth, playerType, internalUsers),
        this.getBonusesReportCumulativeLastHourData(sumStartDate, endDate, playerType, internalUsers)
      ])

      const result = {
        TODAY_BONUS_REPORT: this.mergeBonusData(todayCumulativeData, todayLastHourData),
        YESTERDAY_BONUS_REPORT: this.mergeBonusData(yesterdayCumulativeData, yesterdayLastHourData),
        MONTH_TO_DATE_BONUS_REPORT: this.mergeBonusData(monthToDateCumulativeData, todayLastHourData),
        LAST_MONTH_BONUS_REPORT: this.mergeBonusData(lastMonthCumulativeData, lastMonthLastHourData),
        CUSTOM_DATE_BONUS_REPORT: this.mergeBonusData(selectedDateCumulativeData, selectedDateLastHourData),
        TILL_DATE_BONUS_REPORT: this.mergeBonusData(tillDateCumulativeData, todayLastHourData)
      }
      return transformBonusData(result)
    }
  }

  // Common Functions

  calculateDates () {
    const { startDate = null, endDate = null, timezone: timezoneCode = 'UTC' } = this.args

    const userTimezone = TIMEZONES_WITH_DAYLIGHT_SAVINGS[timezoneCode.toUpperCase()] || 'Europe/London'
    const now = dayjs().tz(userTimezone)

    const safeStart = startDate ? dayjs.tz(startDate, userTimezone).startOf('day') : now.subtract(3, 'month').startOf('day')
    const safeEnd = endDate ? dayjs.tz(endDate, userTimezone).endOf('day') : now.endOf('day')

    return {
      startDate: safeStart.utc().toDate(),
      endDate: safeEnd.utc().toDate(),
      todayStart: now.startOf('day').utc().toDate(),
      todayEnd: now.endOf('day').utc().toDate(),
      yesterdayStart: now.subtract(1, 'day').startOf('day').utc().toDate(),
      yesterdayEnd: now.subtract(1, 'day').endOf('day').utc().toDate(),
      startOfMonth: now.startOf('month').utc().toDate(),
      startOfLastMonth: now.subtract(1, 'month').startOf('month').utc().toDate(),
      endOfLastMonth: now.subtract(1, 'month').endOf('month').utc().toDate()
    }
  }

  calculateDateTimeForAggregatedData (endDate) {
    // Getting aggregated date endDate = 1 hour & 1ms less from current time
    const date = new Date()
    const aggregatedEndDate = new Date(date)
    aggregatedEndDate.setMinutes(Math.floor(date.getMinutes() / 30) * 30 - 61)
    aggregatedEndDate.setSeconds(59)
    aggregatedEndDate.setMilliseconds(999)

    if (aggregatedEndDate > new Date(endDate)) {
      return {
        aggregatedEndDate: endDate, // Meaning till end date we have correct data and no need to do additional sum.
        sumStartDate: null
      }
    }

    // Get normal query startDate
    const sumStartDate = new Date(aggregatedEndDate)
    sumStartDate.setMilliseconds(aggregatedEndDate.getMilliseconds() + 1)

    return {
      aggregatedEndDate: aggregatedEndDate,
      sumStartDate: sumStartDate
    }
  }

  async internalUsersCache () {
    const {
      dbModels: {
        User: UserModel
      }
    } = this.context

    const { client } = redisClient
    const redisReady = Boolean(client && client.status === 'ready')

    // Redis is optional in local/dev. If it's down, ioredis will queue commands forever by default,
    // which can cause the whole dashboard request to "spin" indefinitely. Fail fast + fall back to DB.
    if (redisReady) {
      try {
        const internalUsers = await client.get('internalUsers')
        if (internalUsers) return JSON.parse(internalUsers)
      } catch (_) {
        // ignore redis errors and fall back to DB
      }
    }

    const internalUsersArray = (await UserModel.findAll({ where: { isInternalUser: true }, attributes: ['userId'] })).map(obj => { return obj.userId })

    if (internalUsersArray.length === 0) internalUsersArray.push('-1') // For Fail Safety
    if (redisReady) {
      try {
        await client.set('internalUsers', JSON.stringify(internalUsersArray))
      } catch (_) {
        // ignore redis errors
      }
    }

    return internalUsersArray
  }

  // Dashboard Report Functions
  async getDashBoardReportCumulativeData (startDate, endDate, playerType) {
    let selectFields = `ROUND(ROUND(SUM(sc_real_staked_sum)::NUMERIC, 2) + ROUND(SUM(sc_test_staked_sum)::NUMERIC, 2)::NUMERIC, 2) AS "scStakeSum",
                        ROUND(ROUND(SUM(sc_real_win_sum)::NUMERIC, 2) + ROUND(SUM(sc_test_win_sum)::NUMERIC, 2)::NUMERIC, 2) AS "scWinSum",
                        ROUND(ROUND(SUM(real_sc_awarded_amount)::NUMERIC, 2) + ROUND(SUM(test_sc_awarded_amount)::NUMERIC, 2)::NUMERIC, 2) AS "scAwardedTotal",
                        ROUND(ROUND(SUM(real_gc_awarded_amount)::NUMERIC, 2) + ROUND(SUM(test_gc_awarded_amount)::NUMERIC, 2)::NUMERIC, 2) AS "gcAwardedTotal",
                        ROUND(SUM(jackpot_revenue)::numeric, 2) AS "jackpotRevenue",
                        ROUND(SUM(pending_redemption_amount)::NUMERIC, 2)  + ROUND(SUM(approved_redemption_amount)::NUMERIC, 2) AS "redemptionSum",
                        ROUND(SUM(real_purchase_amount)::NUMERIC, 2) + ROUND(SUM(test_purchase_amount)::NUMERIC, 2) AS "purchaseSum"`
    if (playerType === 'internal') {
      selectFields = `ROUND(SUM(sc_test_staked_sum)::NUMERIC, 2) AS "scStakeSum",
                      ROUND(SUM(sc_test_win_sum)::NUMERIC, 2) AS "scWinSum",
                      ROUND(SUM(test_sc_awarded_amount)::NUMERIC, 2) AS "scAwardedTotal",
                      ROUND(SUM(test_gc_awarded_amount)::NUMERIC, 2) AS "gcAwardedTotal"`
    } else if (playerType === 'real') {
      selectFields = `ROUND(SUM(sc_real_staked_sum)::NUMERIC, 2) AS "scStakeSum",
                      ROUND(SUM(sc_real_win_sum)::NUMERIC, 2) AS "scWinSum",
                      ROUND(SUM(real_sc_awarded_amount)::NUMERIC, 2) AS "scAwardedTotal",
                      ROUND(SUM(real_gc_awarded_amount)::NUMERIC, 2) AS "gcAwardedTotal",
                      ROUND(SUM(jackpot_revenue)::numeric, 2) AS "jackpotRevenue",
                      ROUND(SUM(pending_redemption_amount)::NUMERIC, 2)  + ROUND(SUM(approved_redemption_amount)::NUMERIC, 2) AS "redemptionSum",
                      ROUND(SUM(real_purchase_amount)::NUMERIC, 2) + ROUND(SUM(test_purchase_amount)::NUMERIC, 2) AS "purchaseSum"`
    }

    const [[{ scStakeSum, scWinSum, scAwardedTotal, gcAwardedTotal, jackpotRevenue, redemptionSum, purchaseSum }]] = await database.query(`SELECT ${selectFields} FROM public.dashboard_reports WHERE "timestamp" BETWEEN :startDate AND :endDate`, {
      types: QueryTypes.SELECT,
      replacements: {
        startDate,
        endDate
      }
    })

    return { scStakeSum: +scStakeSum || 0, scWinSum: +scWinSum || 0, scAwardedTotal: +scAwardedTotal || 0, gcAwardedTotal: +gcAwardedTotal || 0, jackpotRevenueTotal: +jackpotRevenue || 0, redemptionSumTotal: +redemptionSum || 0, purchaseSumTotal: +purchaseSum || 0 }
  }

  async getDashboardOverallCumulativeDate (startDate, endDate, playerType) {
    const [data] = await database.query(`
      SELECT
        ROUND(SUM(pending_redemption_amount)::NUMERIC, 2)  + ROUND(SUM(approved_redemption_amount)::NUMERIC, 2) AS "redemptionSum",
        ROUND(SUM(real_purchase_amount)::NUMERIC, 2) + ROUND(SUM(test_purchase_amount)::NUMERIC, 2) AS "purchaseSum"
      FROM
        public.dashboard_reports
      WHERE
        "timestamp" BETWEEN :startDate AND :endDate
    `, {
      type: QueryTypes.SELECT,
      replacements: {
        startDate,
        endDate
      }
    })

    return data
  }

  async getDashBoardReportLast1HourData (startDate, endDate, internalUsers, playerType) {
    let casinoTransactionQuery = ''
    let transactionDataQuery = ''
    if (playerType === 'real') {
      casinoTransactionQuery = `AND user_id NOT IN (${internalUsers})`
      transactionDataQuery = `AND actionee_id NOT IN (${internalUsers})`
    } else if (playerType === 'internal') {
      casinoTransactionQuery = `AND user_id IN (${internalUsers})`
      transactionDataQuery = `AND actionee_id IN (${internalUsers})`
    }

    const jackpotQuery = await this.jackpotQueryMaker(startDate, endDate)
    const [
      [{ directScStakeSum, directScWinSum, scBonusSum1, gcBonusSum1, jackpotRevenue }],
      [{ scBonusSum2, gcBonusSum2, scBonusSum3, gcBonusSum3 }],
      [{ pendingRedemptionSum, approvedRedemptionSum }],
      [{ purchaseSum }]
    ] = await Promise.all([
      database.query(`
        SELECT
          ROUND(SUM(CASE WHEN action_type = 'bet' AND amount_type = 1 THEN COALESCE(amount, 0) ELSE 0 END)::numeric, 2) AS "directScStakeSum",
          ROUND(SUM(CASE WHEN action_type = 'win' AND amount_type = 1 THEN COALESCE(amount, 0) ELSE 0 END)::numeric, 2) AS "directScWinSum",
          ROUND(SUM(CASE WHEN action_id = '1' AND action_type IN (:bonusTypes) THEN COALESCE(sc, 0) ELSE 0 END)::numeric, 2) AS "scBonusSum1",
          ROUND(SUM(CASE WHEN action_id = '1' AND action_type IN (:bonusTypes) THEN COALESCE(gc, 0) ELSE 0 END)::numeric, 2) AS "gcBonusSum1" ${jackpotQuery ? `, ${jackpotQuery} ` : ''}
        FROM
          public.casino_transactions
        WHERE
          created_at BETWEEN :startDate AND :endDate AND status = 1 ${casinoTransactionQuery};
       `, {
        type: QueryTypes.SELECT,
        replacements: {
          internalUsers: internalUsers,
          startDate,
          endDate,
          bonusTypes: Object.values(BONUS_TYPE)
        }
      }),
      database.query(`
        SELECT
          ROUND(SUM(CASE WHEN transaction_type = 'deposit' THEN COALESCE(bonus_sc, 0) ELSE 0 END)::numeric, 2) AS "scBonusSum2",
          ROUND(SUM(CASE WHEN transaction_type = 'deposit' THEN COALESCE(bonus_gc, 0) ELSE 0 END)::numeric, 2) AS "gcBonusSum2",
          ROUND(SUM(CASE WHEN transaction_type = 'addSc' THEN COALESCE(amount, 0) ELSE 0 END)::numeric, 2) AS "scBonusSum3",
          ROUND(SUM(CASE WHEN transaction_type = 'addGc' THEN COALESCE(amount, 0) ELSE 0 END)::numeric, 2) AS "gcBonusSum3"
          FROM
          public.transaction_bankings
        WHERE
          is_success = true AND 
          updated_at BETWEEN :startDate AND :endDate ${transactionDataQuery};
        `, {
        type: QueryTypes.SELECT,
        replacements: {
          internalUsers: internalUsers,
          startDate,
          endDate
        }
      }),
      database.query(`
        SELECT
          -- PENDING REDEMPTION SUM
          ROUND(SUM(CASE WHEN created_at BETWEEN :startDate AND :endDate AND status IN (0, 8) THEN COALESCE(amount, 0) ELSE 0 END)) AS "pendingRedemptionSum",
          -- APPROVED REDEMPTION SUM
          ROUND(SUM(CASE WHEN updated_at BETWEEN :startDate AND :endDate AND status IN (1, 7) THEN COALESCE(amount, 0) ELSE 0 END)) AS "approvedRedemptionSum"
        FROM
          public.withdraw_requests
        WHERE
          :playerType != 'internal';
          `, {
        type: QueryTypes.SELECT,
        replacements: {
          playerType,
          startDate,
          endDate
        }
      }),
      database.query(`
        SELECT
          ROUND(SUM(CASE WHEN transaction_type = 'deposit' THEN COALESCE(amount, 0) ELSE 0 END)::numeric, 2) AS "purchaseSum"
        FROM
          public.transaction_bankings
        WHERE
          is_success = true AND 
          updated_at BETWEEN :startDate AND :endDate;`, {
        type: QueryTypes.SELECT,
        replacements: {
          startDate,
          endDate
        }
      })
    ])

    return {
      directScStakeSum: +directScStakeSum || 0,
      directScWinSum: +directScWinSum || 0,
      directScAwardedTotal: +round(+plus(+scBonusSum1 || 0, +scBonusSum2 || 0, +scBonusSum3 || 0), 2),
      directGcAwardedTotal: +round(+plus(+gcBonusSum1 || 0, +gcBonusSum2 || 0, +gcBonusSum3 || 0), 2),
      totalJackpotRevenue: +round(+jackpotRevenue || 0, 2),
      totalRedemptionSum: +round(+plus(+pendingRedemptionSum || 0, +approvedRedemptionSum || 0), 2),
      totalPurchaseSum: +purchaseSum || 0
    }
  }

  async getLoggedInAndActivePlayerCount () {
    const { client } = redisClient
    if (!client || client.status !== 'ready') return { loggedInUsers: 0, activePlayers: 0 }

    // Internal Function
    const scanCount = async (pattern) => {
      let cursor = '0'
      let total = 0

      do {
        try {
          const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 5000)
          cursor = nextCursor
          total += keys.length
        } catch (_) {
          return total
        }
      } while (cursor !== '0')

      return total
    }

    let loggedInUsers = 0
    let activePlayers = 0
    try {
      [loggedInUsers, activePlayers] = await Promise.all([scanCount('user:*'), scanCount('gamePlay:*')])
    } catch (_) {
      // ignore redis errors
    }

    return { loggedInUsers, activePlayers }
  }

  async getLiveScAndVaultScCount () {
    const [{ totalWalletScCoin, totalVaultScCoin }] = await database.query(
      `
      SELECT
        ROUND(SUM(COALESCE(CAST(sc_coin ->> 'bsc' AS NUMERIC), 0) + COALESCE(CAST(sc_coin ->> 'psc' AS NUMERIC), 0) + COALESCE(CAST(sc_coin ->> 'wsc' AS NUMERIC), 0)), 2) AS "totalWalletScCoin",
        ROUND(SUM(COALESCE(CAST(vault_sc_coin ->> 'bsc' AS NUMERIC), 0) + COALESCE(CAST(vault_sc_coin ->> 'psc' AS NUMERIC), 0) + COALESCE(CAST(vault_sc_coin ->> 'wsc' AS NUMERIC), 0)), 2) AS "totalVaultScCoin"
      FROM
        public.wallets
      `,
      {
        type: QueryTypes.SELECT
      })

    return {
      walletScCoin: totalWalletScCoin || 0,
      vaultScCoin: totalVaultScCoin || 0
    }
  }

  // Login Data Functions
  async getLoginCount (todayStart, todayEnd, yesterdayStart, yesterdayEnd, startOfMonth, startOfLastMonth, startDate, endDate, internalUsers, playerType) {
    let condition = ''
    if (internalUsers.length > 0) condition = playerType !== 'all' ? `AND user_activities.user_id ${playerType === 'internal' ? ' IN ' : ' NOT IN '} (${internalUsers})` : ''

    const query = `
          SELECT
            -- Today's Unique Logins
            COUNT(DISTINCT user_activities.user_id) FILTER ( WHERE user_activities.created_at >= :todayStart AND user_activities.created_at < :todayEnd ) AS "todayUniqueLoginCount",
            -- Today's Total Logins
            COUNT(user_activities.user_id) FILTER (WHERE user_activities.created_at >= :todayStart AND user_activities.created_at < :todayEnd) AS "todayLoginCount",
            -- Yesterday's Unique Logins
            COUNT(DISTINCT user_activities.user_id) FILTER (WHERE user_activities.created_at >= :yesterdayStart AND user_activities.created_at < :yesterdayEnd ) AS "yesterdayUniqueLoginCount",
            -- Yesterday's Total Logins
            COUNT(user_activities.user_id) FILTER (WHERE user_activities.created_at >= :yesterdayStart AND user_activities.created_at < :yesterdayEnd ) AS "yesterdayLoginCount",
            -- Month-To-Date (MTD) Unique Logins
            COUNT(DISTINCT user_activities.user_id) FILTER (WHERE user_activities.created_at >= :startOfMonth AND user_activities.created_at < :todayEnd ) AS "mtdUniqueLoginCount",
            -- Month-To-Date (MTD) Total Logins
            COUNT(user_activities.user_id) FILTER (WHERE user_activities.created_at >= :startOfMonth AND user_activities.created_at < :todayEnd ) AS "mtdLoginCount",
            -- Last Month's Unique Logins
            COUNT(DISTINCT user_activities.user_id) FILTER (WHERE user_activities.created_at >= :startOfLastMonth AND user_activities.created_at < :startOfMonth ) AS "lastMonthUniqueLoginCount",
            -- Last Month's Total Logins
            COUNT(user_activities.user_id) FILTER (WHERE user_activities.created_at >= :startOfLastMonth  AND user_activities.created_at < :startOfMonth ) AS "lastMonthLoginCount",
            -- selected date's Unique Logins
            COUNT(DISTINCT user_activities.user_id) FILTER (WHERE user_activities.created_at >= :startDate AND user_activities.created_at < :endDate ) AS "selectedDateUniqueLoginCount",
            -- selected date's Total Logins
            COUNT(user_activities.user_id) FILTER (WHERE user_activities.created_at >= :startDate AND user_activities.created_at < :endDate ) AS "selectedDateLoginCount"
          FROM
            public.user_activities
          WHERE
            activity_type = 'login'
          ${condition};
        `

    const [loginCounts] = await database.query(query, {
      type: QueryTypes.SELECT,
      replacements: { todayStart, todayEnd, yesterdayStart, yesterdayEnd, startOfMonth, startOfLastMonth, startDate, endDate, internalUsers }
    })
    return loginCounts
  }

  async getTillDateLoginCount (internalUsers, playerType) {
    let condition = ''
    if (internalUsers.length > 0) condition = playerType !== 'all' ? `AND user_activities.user_id ${playerType === 'internal' ? 'IN' : 'NOT IN'} (${internalUsers})` : ''

    const query = `
          SELECT
            COUNT(DISTINCT user_activities.user_id) AS "uniqueLoginCountTillDate",
            COUNT(user_activities.user_id) AS "loginCountTillDate"
          FROM
            public.user_activities
          WHERE
            activity_type = 'login'
          ${condition};
        `
    const [loginCounts] = await database.query(query, {
      type: QueryTypes.SELECT,
      replacements: { internalUsers }
    })
    return loginCounts
  }

  // Customer Data
  async getCustomerReportCumulativeData (startDate, endDate, playerType) {
    const [data] = await database.query(`
      SELECT
        ROUND(SUM(CASE WHEN :playerType != 'internal' THEN registered_player_count ELSE 0 END)::numeric, 2) AS "newRegisteredPlayer",
        ROUND(SUM(CASE WHEN :playerType = 'real' THEN real_first_time_purchaser_count WHEN :playerType = 'internal' THEN test_first_time_purchaser_count WHEN :playerType = 'all' THEN real_first_time_purchaser_count + test_first_time_purchaser_count ELSE 0 END)::numeric, 2) AS "firstPurchaseCount",
        ROUND(SUM(CASE WHEN :playerType = 'real' THEN real_first_time_purchaser_amount WHEN :playerType = 'internal' THEN test_first_time_purchaser_amount WHEN :playerType = 'all' THEN real_first_time_purchaser_amount + test_first_time_purchaser_amount ELSE 0 END)::numeric, 2) AS "firstPurchaseSum",
        ROUND(SUM(CASE WHEN :playerType = 'real' THEN real_purchase_amount WHEN :playerType = 'internal' THEN test_purchase_amount WHEN :playerType = 'all' THEN real_purchase_amount + test_purchase_amount ELSE 0 END)::numeric, 2) AS "purchaseSum",
        ROUND(SUM(CASE WHEN :playerType = 'real' THEN real_purchase_count WHEN :playerType = 'internal' THEN test_purchase_count WHEN :playerType = 'all' THEN real_purchase_count + test_purchase_count ELSE 0 END)::numeric, 2) AS "purchaseCount",
        ROUND(SUM(CASE WHEN :playerType != 'internal' THEN request_redemption_amount ELSE 0 END)::numeric, 2) AS "requestRedemptionSum",
        ROUND(SUM(CASE WHEN :playerType != 'internal' THEN request_redemption_count ELSE 0 END)::numeric, 2) AS "requestRedemptionCount",
        ROUND(SUM(CASE WHEN :playerType != 'internal' THEN approved_redemption_amount ELSE 0 END)::numeric, 2) AS "approvedRedemptionSum",
        ROUND(SUM(CASE WHEN :playerType != 'internal' THEN approved_redemption_count ELSE 0 END)::numeric, 2) AS "approvedRedemptionCount",
        ROUND(SUM(CASE WHEN :playerType != 'internal' THEN cancelled_redemption_amount ELSE 0 END)::numeric, 2) AS "cancelledRedemptionSum",
        ROUND(SUM(CASE WHEN :playerType != 'internal' THEN cancelled_redemption_count ELSE 0 END)::numeric, 2) AS "cancelledRedemptionCount",
        ROUND(SUM(CASE WHEN :playerType != 'internal' THEN pending_redemption_count ELSE 0 END)::numeric, 2) AS "pendingRedemptionCount",
        ROUND(SUM(CASE WHEN :playerType != 'internal' THEN pending_redemption_amount ELSE 0 END)::numeric, 2) AS "pendingRedemptionAmount",
        ROUND(SUM(CASE WHEN :playerType != 'internal' THEN failed_redemption_count ELSE 0 END)::numeric, 2) AS "failedRedemptionCount",
        ROUND(SUM(CASE WHEN :playerType != 'internal' THEN failed_redemption_amount ELSE 0 END)::numeric, 2) AS "failedRedemptionAmount"
      FROM
        public.dashboard_reports
      WHERE
        "timestamp" BETWEEN :startDate AND :endDate;
    `, {
      type: QueryTypes.SELECT,
      replacements: {
        startDate,
        endDate,
        playerType
      }
    })

    return data
  }

  async getCustomerReportLastHourData (startDate, endDate, playerType, internalUsers) {
    if (startDate === null) return { newRegisteredPlayer: 0, realFirstTimePurchaseCount: 0, realFirstTimePurchaseSum: 0, realPurchaseSum: 0, realPurchaseCount: 0, requestRedemptionSum: 0, requestRedemptionCount: 0, approvedRedemptionSum: 0, approvedRedemptionCount: 0, cancelledRedemptionSum: 0, cancelledRedemptionCount: 0 }
    let condition = ''
    if (internalUsers.length > 0) condition = playerType !== 'all' ? `AND actionee_id ${playerType === 'internal' ? ' IN ' : ' NOT IN '} (${internalUsers})` : ''
    const [
      [{ newRegisteredPlayer }],
      [{ requestRedemptionCount, requestRedemptionSum, cancelledRedemptionCount, cancelledRedemptionSum, pendingRedemptionSum, pendingRedemptionCount, failedRedemptionCount, failedRedemptionSum }],
      [{ approvedRedemptionCount, approvedRedemptionSum }],
      [{ firstPurchaseCount, firstPurchaseSum, purchaseSum, purchaseCount }]
    ] = await Promise.all([
      database.query(`
        SELECT COUNT (*) AS "newRegisteredPlayer" FROM public.users WHERE created_at BETWEEN :startDate AND :endDate AND :playerType != 'internal'`, {
        type: QueryTypes.SELECT,
        replacements: {
          startDate,
          endDate,
          playerType
        }
      }),
      database.query(`
        SELECT
          -- REQUESTED REDEMPTION COUNT
          COUNT(CASE WHEN created_at BETWEEN :startDate AND :endDate THEN 1 END) AS "requestRedemptionCount",
          -- REQUESTED REDEMPTION SUM
          ROUND(SUM(CASE WHEN created_at BETWEEN :startDate AND :endDate THEN COALESCE(amount, 0) ELSE 0 END)) AS "requestRedemptionSum",
          -- REDEEM CANCELLED COUNT
          COUNT(CASE WHEN updated_at BETWEEN :startDate AND :endDate AND status = 2 THEN 1 END) AS "cancelledRedemptionCount",
          -- REDEEM CANCELLED SUM
          ROUND(SUM(CASE WHEN updated_at BETWEEN :startDate AND :endDate AND status = 2 THEN COALESCE(amount, 0) ELSE 0 END)::numeric, 2) AS "cancelledRedemptionSum",
          -- PENDING REDEMPTION COUNT
          COUNT(CASE WHEN created_at BETWEEN :startDate AND :endDate AND status = 0 THEN 1 END) AS "pendingRedemptionCount",
          -- PENDING REDEMPTION SUM
          ROUND(SUM(CASE WHEN created_at BETWEEN :startDate AND :endDate AND status = 0 THEN COALESCE(amount, 0) ELSE 0 END)) AS "pendingRedemptionSum",
          -- FAILED REDEMPTION COUNT
          COUNT(CASE WHEN updated_at BETWEEN :startDate AND :endDate AND status IN (3, 6) THEN 1 END) AS "failedRedemptionCount",
          -- FAILED REDEMPTION SUM
          ROUND(SUM(CASE WHEN updated_at BETWEEN :startDate AND :endDate AND status IN (3, 6) THEN COALESCE(amount, 0) ELSE 0 END)) AS "failedRedemptionSum"
        FROM 
          public.withdraw_requests
        WHERE
          :playerType != 'internal';
        `, {
        type: QueryTypes.SELECT,
        replacements: {
          playerType,
          startDate,
          endDate
        }
      }),
      database.query(`
        SELECT
          -- APPROVED REDEMPTION TOTAL (inprogress or completed)
          COUNT(*) AS "approvedRedemptionCount",
          -- APPROVED REDEMPTION SUM
          ROUND(SUM(COALESCE(amount, 0))::numeric, 2) AS "approvedRedemptionSum"
        FROM 
          public.transaction_bankings
        WHERE
        transaction_type = 'redeem' AND status IN (1, 7) AND
        created_at BETWEEN :startDate AND :endDate AND
        :playerType != 'internal';
        `, {
        type: QueryTypes.SELECT,
        replacements: {
          playerType,
          startDate,
          endDate
        }
      }),
      database.query(`
        SELECT
          COUNT(CASE WHEN transaction_type = 'deposit' AND is_first_deposit = true THEN 1 END) AS "firstPurchaseCount",
          ROUND(SUM(CASE WHEN transaction_type = 'deposit' AND is_first_deposit = true THEN COALESCE(amount, 0) ELSE 0 END)::numeric, 2) AS "firstPurchaseSum",
          ROUND(SUM(CASE WHEN transaction_type = 'deposit' THEN COALESCE(amount, 0) ELSE 0 END)::numeric, 2) AS "purchaseSum",
          COUNT(CASE WHEN transaction_type = 'deposit' THEN 1 END) AS "purchaseCount"
        FROM
          public.transaction_bankings
        WHERE
          is_success = true AND 
          updated_at BETWEEN :startDate AND :endDate ${condition};`, {
        type: QueryTypes.SELECT,
        replacements: {
          startDate,
          endDate,
          playerType,
          internalUsers
        }
      })
    ])

    return {
      newRegisteredPlayer,
      requestRedemptionCount,
      requestRedemptionSum,
      cancelledRedemptionCount,
      cancelledRedemptionSum,
      approvedRedemptionCount,
      approvedRedemptionSum,
      firstPurchaseCount,
      firstPurchaseSum,
      purchaseSum,
      purchaseCount,
      pendingRedemptionCount,
      pendingRedemptionSum,
      failedRedemptionCount,
      failedRedemptionSum
    }
  }

  // Coin Economy Data
  async getCoinEconomyCumulativeData (startDate, endDate, playerType) {
    const [data] = await database.query(`
      SELECT
        ROUND(SUM(CASE WHEN :playerType = 'real' THEN real_gc_credit_purchase_amount WHEN :playerType = 'internal' THEN test_gc_credit_purchase_amount WHEN :playerType = 'all' THEN real_gc_credit_purchase_amount + test_gc_credit_purchase_amount ELSE 0 END)::numeric, 2) AS "gcCreditPurchaseSum",
        ROUND(SUM(CASE WHEN :playerType = 'real' THEN real_sc_credit_purchase_amount WHEN :playerType = 'internal' THEN test_sc_credit_purchase_amount WHEN :playerType = 'all' THEN real_sc_credit_purchase_amount + test_sc_credit_purchase_amount ELSE 0 END)::numeric, 2) AS "scCreditPurchaseSum",
        ROUND(SUM(CASE WHEN :playerType = 'real' THEN real_gc_awarded_amount WHEN :playerType = 'internal' THEN test_gc_awarded_amount WHEN :playerType = 'all' THEN real_gc_awarded_amount + test_gc_awarded_amount ELSE 0 END)::numeric, 2) AS "gcAwardedAmountSum",
        ROUND(SUM(CASE WHEN :playerType = 'real' THEN real_sc_awarded_amount WHEN :playerType = 'internal' THEN test_sc_awarded_amount WHEN :playerType = 'all' THEN real_sc_awarded_amount + test_sc_awarded_amount ELSE 0 END)::numeric, 2) AS "scAwardedAmountSum"
      FROM
        dashboard_reports
      WHERE
        "timestamp" BETWEEN :startDate AND :endDate;`, {
      type: QueryTypes.SELECT,
      replacements: {
        playerType,
        startDate,
        endDate
      }
    })

    return data
  }

  async getCoinEconomyCumulativeLastHourData (startDate, endDate, playerType, internalUsers) {
    if (startDate === null) return { gcCreditPurchaseSum: 0, scCreditPurchaseSum: 0, gcAwardedAmountSum: 0, scAwardedAmountSum: 0 }

    let casinoTransactionCondition, transactionBankingCondition
    if (internalUsers.length > 0) {
      casinoTransactionCondition = playerType !== 'all' ? `AND user_id ${playerType === 'internal' ? ' IN ' : ' NOT IN '} (${internalUsers})` : ''
      transactionBankingCondition = playerType !== 'all' ? `AND actionee_id ${playerType === 'internal' ? ' IN ' : ' NOT IN '} (${internalUsers})` : ''
    }

    const [
      [{ scBonusSum1, gcBonusSum1 }],
      [{ gcCreditPurchaseSum, scCreditPurchaseSum, scBonusSum2, gcBonusSum2 }]
    ] = await Promise.all([
      database.query(`
        SELECT
          ROUND(SUM(COALESCE(sc, 0))::numeric, 2) AS "scBonusSum1",
          ROUND(SUM(COALESCE(gc, 0))::numeric, 2) AS "gcBonusSum1"
        FROM
          casino_transactions
        WHERE
          created_at BETWEEN :startDate AND :endDate AND status = 1 AND action_id = '1'
          AND action_type IN (:bonusType) ${casinoTransactionCondition};`, {
        type: QueryTypes.SELECT,
        replacements: {
          startDate,
          endDate,
          internalUsers,
          bonusType: Object.values(BONUS_TYPE)
        }
      }),
      database.query(`
        SELECT
          ROUND(SUM(CASE WHEN transaction_type = 'deposit' THEN COALESCE(bonus_sc, 0) WHEN transaction_type = 'addSc' THEN COALESCE(amount, 0) ELSE 0 END)::numeric, 2) AS "scBonusSum2",
          ROUND(SUM(CASE WHEN transaction_type = 'deposit' THEN COALESCE(bonus_gc, 0) WHEN transaction_type = 'addGc' THEN COALESCE(amount, 0) ELSE 0 END)::numeric, 2) AS "gcBonusSum2",
          ROUND(SUM(CASE WHEN transaction_type = 'deposit' THEN COALESCE(sc_coin, 0) ELSE 0 END)::numeric, 2) AS "scCreditPurchaseSum",
          ROUND(SUM(CASE WHEN transaction_type = 'deposit' THEN COALESCE(gc_coin, 0) ELSE 0 END)::numeric, 2) AS "gcCreditPurchaseSum"
        FROM
          transaction_bankings
        WHERE
          is_success = true AND updated_at BETWEEN :startDate AND :endDate
          ${transactionBankingCondition};`, {
        type: QueryTypes.SELECT,
        replacements: {
          startDate,
          endDate,
          playerType,
          internalUsers
        }
      })
    ])

    return {
      gcCreditPurchaseSum,
      scCreditPurchaseSum,
      scAwardedAmountSum: +round(+plus(+scBonusSum1 || 0, +scBonusSum2 || 0), 2),
      gcAwardedAmountSum: +round(+plus(+gcBonusSum1 || 0, +gcBonusSum2 || 0), 2)
    }
  }

  // Transaction Data
  async getTransactionCumulativeData (startDate, endDate, playerType) {
    const [data] = await database.query(`
      SELECT
        ROUND(SUM(CASE WHEN :playerType = 'real' THEN sc_real_staked_sum WHEN :playerType = 'internal' THEN sc_test_staked_sum WHEN :playerType = 'all' THEN sc_real_staked_sum + sc_test_staked_sum ELSE 0 END)::numeric, 2) AS "scStakedSum",
        ROUND(SUM(CASE WHEN :playerType = 'real' THEN sc_real_win_sum WHEN :playerType = 'internal' THEN sc_test_win_sum WHEN :playerType = 'all' THEN sc_real_win_sum + sc_test_win_sum ELSE 0 END)::numeric, 2) AS "scWinSum",
        ROUND(SUM(jackpot_revenue)::numeric, 2) AS "jackpotRevenue"
      FROM
        dashboard_reports
      WHERE
        "timestamp" BETWEEN :startDate AND :endDate`, {
      type: QueryTypes.SELECT,
      replacements: {
        playerType,
        startDate,
        endDate
      }
    })

    return data
  }

  async getTransactionCumulativeLastHourData (startDate, endDate, playerType, internalUsers) {
    if (startDate === null) return { scStakedSum: 0, scWinSum: 0 }

    let condition = ''
    if (internalUsers.length > 0) condition = playerType !== 'all' ? `AND user_id ${playerType === 'internal' ? ' IN ' : ' NOT IN '} (${internalUsers})` : ''

    const jackpotQuery = await this.jackpotQueryMaker(startDate, endDate)

    const [data] = await database.query(`
      SELECT
        ROUND(SUM(CASE WHEN action_type = 'bet' THEN COALESCE(amount, 0) ELSE 0 END)::numeric, 2) AS "scStakedSum",
        ROUND(SUM(CASE WHEN action_type = 'win' THEN COALESCE(amount, 0) ELSE 0 END)::numeric, 2) AS "scWinSum"${jackpotQuery ? `, ${jackpotQuery}` : ''}
      FROM
        public.casino_transactions
      WHERE
        created_at BETWEEN :startDate AND :endDate AND amount_type = 1 AND status = 1 ${condition};`, {
      type: QueryTypes.SELECT,
      replacements: {
        startDate,
        endDate,
        internalUsers
      }
    })

    return data
  }

  async jackpotQueryMaker (startDate, endDate) {
    const {
      dbModels: {
        Jackpot: JackpotModel
      }
    } = this.context

    const [newJackpotCreated, jackpotData] = await Promise.all([
      JackpotModel.findAll({
        attributes: ['jackpotId', 'seedAmount', 'startDate', 'endDate'],
        where: {
          startDate: { [Op.between]: [startDate, endDate] },
          status: [JACKPOT_STATUS.RUNNING, JACKPOT_STATUS.COMPLETED]
        },
        order: [['jackpotId', 'ASC']],
        raw: true
      }),
      JackpotModel.findAll({
        attributes: ['jackpotId', 'startDate', 'endDate', 'adminShare'],
        where: {
          [Op.or]: [
            { endDate: { [Op.between]: [startDate, endDate] } },
            { startDate: { [Op.between]: [startDate, endDate] } },
            { endDate: null }
          ],
          status: [JACKPOT_STATUS.RUNNING, JACKPOT_STATUS.COMPLETED]
        },
        order: [['jackpotId', 'ASC']],
        raw: true
      })
    ])

    const jackpotSeedAmount = newJackpotCreated.map(jackpot => jackpot.seedAmount).reduce((a, b) => a + b, 0)

    if (jackpotData.length === 0) return ''
    if (jackpotData.length === 1) {
      return `ROUND(SUM(CASE WHEN action_type = 'jackpotEntry' AND created_at BETWEEN '${new Date(startDate).toISOString()}' AND '${new Date(endDate).toISOString()}' THEN COALESCE(amount, 0)*${jackpotData[0].adminShare} ELSE 0 END)::numeric, 2) AS "jackpotRevenue"`
    }

    let jackpotQuery = 'ROUND(SUM(CASE WHEN action_type = \'jackpotEntry\' THEN (CASE'
    jackpotData.forEach((jackpot, index) => {
      if (index === 0) jackpotQuery += ` WHEN created_at BETWEEN '${new Date(startDate).toISOString()}' AND '${new Date(jackpot.endDate).toISOString()}' THEN COALESCE(amount, 0)*${jackpot.adminShare}`
      else if (jackpotData.length - 1 === index) jackpotQuery += ` WHEN created_at BETWEEN '${new Date(jackpot.startDate).toISOString()}' AND '${new Date(endDate).toISOString()}' THEN COALESCE(amount, 0)*${jackpot.adminShare}`
      else jackpotQuery += ` WHEN created_at BETWEEN '${new Date(jackpot.startDate).toISOString()}' AND '${new Date(jackpot.endDate).toISOString()}' THEN COALESCE(amount, 0)*${jackpot.adminShare}`
    })
    return jackpotQuery + ` ELSE 0 END) ELSE 0 END)::numeric, 2) - ${jackpotSeedAmount || 0} AS "jackpotRevenue"`
  }

  // Bonuses Report Data
  async getBonusesCumulativeData (startDate, endDate) {
    const [{ bonusData }] = await database.query(`
      WITH summary AS (
        SELECT
          entry.key                                       AS bonus_type,
          SUM((entry.value->>'scBonus')::numeric)         AS sc_bonus,
          SUM((entry.value->>'gcBonus')::numeric)         AS gc_bonus,
          SUM((entry.value->>'totalNoOfUsers')::int)      AS total_users
        FROM dashboard_reports dr
        CROSS JOIN LATERAL jsonb_each(dr.bonus_data) AS entry(key, value)
        WHERE dr."timestamp" BETWEEN :startDate AND :endDate
        GROUP BY entry.key
      )
      SELECT
        jsonb_object_agg(
          bonus_type,
          jsonb_build_object(
            'scBonus',        ROUND(sc_bonus::numeric, 2),
            'gcBonus',        ROUND(gc_bonus::numeric, 2),
            'totalNoOfUsers', total_users
          )
        ) AS "bonusData"
      FROM summary;
    `, {
      type: QueryTypes.SELECT,
      replacements: { startDate, endDate }
    })
    return bonusData
  }

  async getBonusesReportCumulativeLastHourData (startDate, endDate, playerType, internalUsers) {
    if (startDate === null) return { bonusData: {} }
    let casinoTransactionQuery = ''
    let transactionDataQuery = ''
    if (playerType === 'real') {
      casinoTransactionQuery = `AND user_id NOT IN (${internalUsers})`
      transactionDataQuery = `AND actionee_id NOT IN (${internalUsers})`
    } else if (playerType === 'internal') {
      casinoTransactionQuery = `AND user_id IN (${internalUsers})`
      transactionDataQuery = `AND actionee_id IN (${internalUsers})`
    }

    const [
      [{ purchasePromocodeScBonus, purchasePromocodeGcBonus, totalAvailedUsersPurchasePromocodeBonus, crmPromocodeScBonus, crmPromocodeGcBonus, totalAvailedUsersCRMPromocodeBonus, packageScBonus, packageGcBonus, totalAvailedUsersPackageBonus, adminAddedScBonus, totalAvailedUsersAdminAddedBonus }],
      casinoBonus,
      [freeSpinData]
    ] = await Promise.all([
      // Purchase Promocode Bonus
      database.query(`
        SELECT
          -- 1) Purchase‐Promocode SC bonus (only non‐CRM promo, deposit‐type)
          ROUND(SUM(CASE WHEN tb.transaction_type = 'deposit' AND tb.promocode_id <> 0 AND pc.is_discount_on_amount = false AND pc.crm_promocode = false THEN (pc.discount_percentage * (pkg.sc_coin + pkg.bonus_sc)) / 100.0 ELSE 0 END)::numeric, 2) AS "purchasePromocodeScBonus",
          -- 2) Purchase‐Promocode GC bonus (only non‐CRM promo, deposit‐type)
          ROUND(SUM(CASE WHEN tb.transaction_type = 'deposit' AND tb.promocode_id <> 0 AND pc.is_discount_on_amount = false AND pc.crm_promocode = false THEN (pc.discount_percentage * (pkg.gc_coin + pkg.bonus_gc)) / 100.0 ELSE 0 END)::numeric, 2) AS "purchasePromocodeGcBonus",
          -- 3) Count of rows that availed a non‐CRM promo (deposit‐type)
          SUM(CASE WHEN tb.transaction_type = 'deposit' AND tb.promocode_id <> 0 AND pc.is_discount_on_amount = false AND pc.crm_promocode = false THEN 1 ELSE 0 END) AS "totalAvailedUsersPurchasePromocodeBonus",
          -- 4) CRM‐Promocode SC bonus (only CRM promo, deposit‐type)
          ROUND(SUM(CASE WHEN tb.transaction_type = 'deposit' AND tb.promocode_id <> 0 AND pc.is_discount_on_amount = false AND pc.crm_promocode = true THEN (pc.discount_percentage * (pkg.sc_coin + pkg.bonus_sc)) / 100.0 ELSE 0 END)::numeric, 2) AS "crmPromocodeScBonus",
          -- 5) CRM‐Promocode GC bonus (only CRM promo, deposit‐type) 
          ROUND(SUM(CASE WHEN tb.transaction_type = 'deposit' AND tb.promocode_id <> 0 AND pc.is_discount_on_amount = false AND pc.crm_promocode = true THEN (pc.discount_percentage * (pkg.gc_coin + pkg.bonus_gc)) / 100.0 ELSE 0 END)::numeric, 2) AS "crmPromocodeGcBonus",
          -- 6) Count of rows that availed a CRM promo (deposit‐type)
          SUM(CASE WHEN tb.transaction_type = 'deposit' AND tb.promocode_id <> 0 AND pc.is_discount_on_amount = false AND pc.crm_promocode = true THEN 1 ELSE 0 END) AS "totalAvailedUsersCRMPromocodeBonus",
          -- 7) Total package‐bonus SC (all deposit rows)
          TRUNC(SUM(CASE WHEN tb.transaction_type = 'deposit' THEN pkg.bonus_sc ELSE 0 END)::numeric, 2) AS "packageScBonus",
          -- 8) Total package‐bonus GC (all deposit rows)
          TRUNC(SUM(CASE WHEN tb.transaction_type = 'deposit' THEN pkg.bonus_gc ELSE 0 END)::numeric, 2) AS "packageGcBonus",
          -- 9) Count of all deposit rows (i.e. total package‐bonus availed)
          SUM(CASE WHEN tb.transaction_type = 'deposit' THEN 1 ELSE 0 END) AS "totalAvailedUsersPackageBonus",
          -- 10) Admin‐added SC bonus (all addSc rows)
          TRUNC(SUM(CASE WHEN tb.transaction_type = 'addSc' THEN tb.sc_coin ELSE 0 END)::numeric, 2) AS "adminAddedScBonus",
          -- 11) Count of all addSc rows
          SUM(CASE WHEN tb.transaction_type = 'addSc' THEN 1 ELSE 0 END) AS "totalAvailedUsersAdminAddedBonus"
      
        FROM public.transaction_bankings tb
          LEFT JOIN public.package pkg ON tb.package_id = pkg.package_id
          LEFT JOIN public.promo_codes pc ON tb.promocode_id = pc.promocode_id AND pc.is_discount_on_amount = false
        WHERE tb.status = 1 AND tb.is_success = true AND tb.updated_at BETWEEN :startDate AND :endDate AND ( tb.transaction_type = 'deposit' OR tb.transaction_type = 'addSc') ${transactionDataQuery};
      `, {
        type: QueryTypes.SELECT,
        replacements: {
          startDate,
          endDate
        }
      }),
      // Casino Bonus Data
      database.query(`
      WITH casinoBonus AS 
        (SELECT action_type AS bonus_type, TRUNC(SUM(sc)::numeric, 2) AS sc_amount, TRUNC(SUM(gc)::numeric, 2) AS gc_amount, COUNT(*) AS total_users
          FROM public.casino_transactions
          WHERE created_at BETWEEN :startDate AND :endDate AND action_id = '1' AND action_type IN (:bonusTypes) AND status = 1 ${casinoTransactionQuery}
          GROUP BY action_type)

      SELECT jsonb_object_agg(bonus_type, jsonb_build_object('scBonus', sc_amount::numeric, 'gcBonus', gc_amount::numeric, 'totalNoOfUsers', total_users::int)) AS "casinoBonusData" FROM casinoBonus
    `, {
        type: QueryTypes.SELECT,
        replacements: {
          startDate,
          endDate,
          bonusTypes: Object.values(BONUS_TYPE)
        }
      }),
      // freeSpin Bonus Data
      database.query(`SELECT 
         COUNT(*) AS "totalUsers",
         ROUND(SUM(sc_amount)::numeric, 2) AS "scAmount",
         ROUND(SUM(gc_amount)::numeric, 2) AS "gcAmount"
         FROM public.user_bonus 
         WHERE updated_at BETWEEN :startDate AND :endDate AND 
         bonus_type = 'free-spin-bonus' AND 
         status = 'CLAIMED'`, {
        type: QueryTypes.SELECT,
        replacements: {
          startDate,
          endDate
        }
      })
    ])

    const casinoBonusData = casinoBonus[0]?.casinoBonusData
    // Bonus Report Data
    const bonusData = {
      amoeBonus: {
        scBonus: casinoBonusData?.['amoe-bonus']?.scBonus || 0,
        gcBonus: casinoBonusData?.['amoe-bonus']?.gcBonus || 0,
        totalNoOfUsers: casinoBonusData?.['amoe-bonus']?.totalNoOfUsers || 0
      },
      tierBonus: {
        scBonus: casinoBonusData?.['tier-bonus']?.scBonus || 0,
        gcBonus: casinoBonusData?.['tier-bonus']?.gcBonus || 0,
        totalNoOfUsers: casinoBonusData?.['tier-bonus']?.totalNoOfUsers || 0
      },
      dailyBonus: {
        scBonus: casinoBonusData?.['daily-bonus']?.scBonus || 0,
        gcBonus: casinoBonusData?.['daily-bonus']?.gcBonus || 0,
        totalNoOfUsers: casinoBonusData?.['daily-bonus']?.totalNoOfUsers || 0
      },
      packageBonus: {
        scBonus: round(+plus(+packageScBonus || 0, casinoBonusData?.['package-bonus']?.scBonus || 0, casinoBonusData?.['first-purchase-bonus']?.scBonus || 0), 2),
        gcBonus: round(+plus(+packageGcBonus || 0, casinoBonusData?.['package-bonus']?.gcBonus || 0, casinoBonusData?.['first-purchase-bonus']?.gcBonus || 0), 2),
        totalNoOfUsers: round(+plus(+totalAvailedUsersPackageBonus || 0, casinoBonusData?.['package-bonus']?.totalNoOfUsers || 0, casinoBonusData?.['first-purchase-bonus']?.totalNoOfUsers || 0), 2)
      },
      rafflePayout: {
        scBonus: casinoBonusData?.['raffle-payout']?.scBonus || 0,
        gcBonus: casinoBonusData?.['raffle-payout']?.gcBonus || 0,
        totalNoOfUsers: casinoBonusData?.['raffle-payout']?.totalNoOfUsers || 0
      },
      welcomeBonus: {
        scBonus: casinoBonusData?.['welcome bonus']?.scBonus || 0,
        gcBonus: casinoBonusData?.['welcome bonus']?.gcBonus || 0,
        totalNoOfUsers: casinoBonusData?.['welcome bonus']?.totalNoOfUsers || 0
      },
      jackpotWinner: {
        scBonus: casinoBonusData?.jackpotWinner?.scBonus || 0,
        gcBonus: casinoBonusData?.jackpotWinner?.gcBonus || 0,
        totalNoOfUsers: casinoBonusData?.jackpotWinner?.totalNoOfUsers || 0
      },
      providerBonus: {
        scBonus: casinoBonusData?.['provider-bonus']?.scBonus || 0,
        gcBonus: casinoBonusData?.['provider-bonus']?.gcBonus || 0,
        totalNoOfUsers: casinoBonusData?.['provider-bonus']?.totalNoOfUsers || 0
      },
      referralBonus: {
        scBonus: casinoBonusData?.['referral-bonus']?.scBonus || 0,
        gcBonus: casinoBonusData?.['referral-bonus']?.gcBonus || 0,
        totalNoOfUsers: casinoBonusData?.['referral-bonus']?.totalNoOfUsers || 0
      },
      affiliateBonus: {
        scBonus: casinoBonusData?.['affiliate-bonus']?.scBonus || 0,
        gcBonus: casinoBonusData?.['affiliate-bonus']?.gcBonus || 0,
        totalNoOfUsers: casinoBonusData?.['affiliate-bonus']?.totalNoOfUsers || 0
      },
      promotionBonus: {
        scBonus: casinoBonusData?.['promotion-bonus']?.scBonus || 0,
        gcBonus: casinoBonusData?.['promotion-bonus']?.gcBonus || 0,
        totalNoOfUsers: casinoBonusData?.['promotion-bonus']?.totalNoOfUsers || 0
      },
      weeklyTierBonus: {
        scBonus: casinoBonusData?.['weekly-tier-bonus']?.scBonus || 0,
        gcBonus: casinoBonusData?.['weekly-tier-bonus']?.gcBonus || 0,
        totalNoOfUsers: casinoBonusData?.['weekly-tier-bonus']?.totalNoOfUsers || 0
      },
      monthlyTierBonus: {
        scBonus: casinoBonusData?.['monthly-tier-bonus']?.scBonus || 0,
        gcBonus: casinoBonusData?.['monthly-tier-bonus']?.gcBonus || 0,
        totalNoOfUsers: casinoBonusData?.['monthly-tier-bonus']?.totalNoOfUsers || 0
      },
      tournamentWinner: {
        scBonus: casinoBonusData?.tournament?.scBonus || 0,
        gcBonus: casinoBonusData?.tournament?.gcBonus || 0,
        totalNoOfUsers: casinoBonusData?.tournament?.totalNoOfUsers || 0
      },
      adminAddedScBonus: {
        scBonus: +adminAddedScBonus || 0,
        gcBonus: 0,
        totalNoOfUsers: +totalAvailedUsersAdminAddedBonus || 0
      },
      crmPromocodeBonus: {
        scBonus: crmPromocodeScBonus || 0,
        gcBonus: crmPromocodeGcBonus || 0,
        totalNoOfUsers: +totalAvailedUsersCRMPromocodeBonus || 0
      },
      purchasePromocodeBonus: {
        scBonus: purchasePromocodeScBonus || 0,
        gcBonus: purchasePromocodeGcBonus || 0,
        totalNoOfUsers: +totalAvailedUsersPurchasePromocodeBonus || 0
      },
      scratchCardBonus: {
        scBonus: casinoBonusData?.['scratch-card-bonus']?.scBonus || 0,
        gcBonus: casinoBonusData?.['scratch-card-bonus']?.gcBonus || 0,
        totalNoOfUsers: casinoBonusData?.['scratch-card-bonus']?.totalNoOfUsers || 0
      },
      vipQuestionnaireBonus: {
        scBonus: casinoBonusData?.['vip-questionnaire-bonus']?.scBonus || 0,
        gcBonus: casinoBonusData?.['vip-questionnaire-bonus']?.gcBonus || 0,
        totalNoOfUsers: casinoBonusData?.['vip-questionnaire-bonus']?.totalNoOfUsers || 0
      },
      freeSpinBonus: {
        scBonus: freeSpinData?.scAmount || 0,
        gcBonus: freeSpinData?.gcAmount || 0,
        totalNoOfUsers: freeSpinData?.totalUsers || 0
      }
    }
    return bonusData
  }

  // Function to merge JSON Cumulative and Last Hours Data for Bonuses Report
  mergeBonusData (cumulativeData = {}, lastHourData = {}) {
    // if last-hour is “empty”, short-circuit
    const lastData = lastHourData || {}
    cumulativeData = cumulativeData || {}

    const allKeys = new Set([
      ...Object.keys(cumulativeData),
      ...Object.keys(lastData)
    ])

    const result = {}
    const total = { scBonus: 0, gcBonus: 0, totalNoOfUsers: 0 }
    for (const key of allKeys) {
      const cum = cumulativeData[key] || { scBonus: 0, gcBonus: 0, totalNoOfUsers: 0 }
      const last = lastData[key] || { scBonus: 0, gcBonus: 0, totalNoOfUsers: 0 }

      result[key] = {
        scBonus: +plus(+cum.scBonus || 0, +last.scBonus || 0),
        gcBonus: +plus(+cum.gcBonus || 0, +last.gcBonus || 0),
        totalNoOfUsers: +plus(+cum.totalNoOfUsers || 0, +last.totalNoOfUsers || 0)
      }

      total.scBonus = +plus(+total.scBonus || 0, +cum.scBonus || 0, +last.scBonus || 0)
      total.gcBonus = +plus(+total.gcBonus || 0, +cum.gcBonus || 0, +last.gcBonus || 0)
      total.totalNoOfUsers = +plus(+total.totalNoOfUsers || 0, +cum.totalNoOfUsers || 0, +last.totalNoOfUsers || 0)
    }

    result.total = total

    return result
  }
}
