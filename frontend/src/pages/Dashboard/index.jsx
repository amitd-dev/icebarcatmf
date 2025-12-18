import React, { useState } from "react";
import {
  Row,
  Col,
  Card
} from "@themesberg/react-bootstrap";
import useDashboardDataListing from "./hooks/useDashboardData";
import DashBoardFilters from "./DashBoardFilters";
import DashboardCharts from "./DashboardCharts";
import LoginDataTable from "./tables/LoginDataTable";
import CustomerTable from "./tables/CustomerDataTable";
import EconomyTable from "./tables/EconomyTable";
import TransactionTable from "./tables/TransactionsTable";
import BonusTable from "./tables/BonusTable";

const Dashboard = () => {
  const [economicDataAccordionOpen, setEconomicDataAccordionOpen] =
    useState(false);
  const [bonusDataAccordionOpen, setBonusDataAccordionOpen] =
    useState(false);
  const [transactionDataAccordianOpen, setTransactionDataAccordianOpen] =
    useState(false);
  const {
    reportData,
    reportRefetch,
    playerType,
    setPlayerType,
    // setTimeStamp,timeStamp,
    t,
    timeZoneCode,
    setStartDate,
    setEndDate,
    reportLoading,
    startDate,
    endDate,
    isReportRefetching,
    reportTillData,
    reportTillLoading,
    reportTillRefetch,
    isReportTillRefetching,
    customerDataV2,
    customerLoadingV2,
    customerRefetchV2,
    isCustomerRefetchingV2,
    economyLoadingV2,
    economyDataV2,
    economyRefetchV2,
    isEconomyRefetchingV2,
    transactionDataV2,
    transactionLoadingV2,
    transactionRefetchV2,
    isTransactionRefetchingV2,
    dashboardDataV2,
    dashboardReportLoadingV2,
    dashboardReportRefetchV2,
    isDashboardReportRefetchingV2,
    bonusDataV2,
    bonusLoadingV2,
    bonusRefetchV2,
    isBonusRefetchingV2,
  } = useDashboardDataListing(
    economicDataAccordionOpen,
    transactionDataAccordianOpen, bonusDataAccordionOpen
  );

  return (
    <>
      <Row className="d-flex">
        <Col sm={8}>
          <h3>{t("title")}</h3>
        </Col>
        {/* <Col sm={4} className='pb-2'>
          <Form.Select
            value={timeStamp}
            onChange={(event) => {
              setTimeStamp(event.target.value);
            }}
          >
            {timeZones?.map(({ labelKey, value ,code }) => {
            return (
              <option key={value} value={value}>
                {t(labelKey)} ({code}) {value}
              </option>
            );
          })}
          </Form.Select>
        </Col> */}
      </Row>
      <Card className="p-2 mb-2 dashboard-typography">
        <DashboardCharts
          customerData={customerDataV2}
          loginData={reportData}
          economyData={economyDataV2}
          transactionData={transactionDataV2}
          dashboardDataV2={dashboardDataV2}
          bonusDataV2={bonusDataV2}
          bonusRefetchV2={bonusRefetchV2}
          dashboardReportLoadingV2={dashboardReportLoadingV2}
          dashboardReportRefetchV2={dashboardReportRefetchV2}
          isDashboardReportRefetchingV2={isDashboardReportRefetchingV2}
        />
        <DashBoardFilters
          setPlayerType={setPlayerType}
          playerType={playerType}
          t={t}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          startDate={startDate}
          endDate={endDate}
          timeZoneCode={timeZoneCode}
          reportRefetch={reportRefetch}
          customerRefetch={customerRefetchV2}
          transactionRefetch={transactionRefetchV2}
          economyRefetch={economyRefetchV2}
          dashboardReportRefetchV2={dashboardReportRefetchV2}
          economicDataAccordionOpen={economicDataAccordionOpen}
          transactionDataAccordianOpen={transactionDataAccordianOpen}
          isDashboardReportRefetchingV2={isDashboardReportRefetchingV2}
          isReportRefetching={isReportRefetching}
          isCustomerRefetching={isCustomerRefetchingV2}
          isEconomyRefetching={isEconomyRefetchingV2}
          isTransactionRefetching={isTransactionRefetchingV2}
          customerRefetchV2={customerRefetchV2}
        />
        <LoginDataTable
          tableKey="loginData"
          reportLoading={reportLoading}
          reportData={reportData}
          t={t}
          reportTillData={reportTillData}
          reportTillLoading={reportTillLoading}
          reportTillRefetch={reportTillRefetch}
          isReportTillRefetching={isReportTillRefetching}
        />
        <hr></hr>
        <CustomerTable
          tableKey="customerDataKeys"
          customerDataV2={customerDataV2}
          customerLoadingV2={customerLoadingV2}
          playerType={playerType}
          customerRefetchV2={customerRefetchV2}
          t={t}
        />
        <hr></hr>
        <EconomyTable
          tableKey="loginData"
          accordionOpen={economicDataAccordionOpen}
          setAccordionOpen={setEconomicDataAccordionOpen}
          economyDataV2={economyDataV2}
          economyLoadingV2={economyLoadingV2}
          economyRefetchV2={economyRefetchV2}
          t={t}
        />
        <TransactionTable
          tableKey="customerDataKeys"
          accordionOpen={transactionDataAccordianOpen}
          setAccordionOpen={setTransactionDataAccordianOpen}
          t={t}
          transactionDataV2={transactionDataV2}
          transactionLoadingV2={transactionLoadingV2}
          transactionRefetchV2={transactionRefetchV2}
        />
        <BonusTable
          tableKey="loginData"
          accordionOpen={bonusDataAccordionOpen}
          setAccordionOpen={setBonusDataAccordionOpen}
          bonusReportData={bonusDataV2}
          loading={bonusLoadingV2}
          bonusRefetchV2={bonusRefetchV2}
          isBonusRefetchingV2={isBonusRefetchingV2}
          t={t}
        />
      </Card>
    </>
  );
};
export default Dashboard;
