import {
  Row,
  Table,
  Accordion,
  Col,
} from "@themesberg/react-bootstrap";
import { InlineLoader } from "../../../components/Preloader";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChevronDown,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { formatPriceWithCommas } from "../../../utils/helper";

const BonusTable = ({
  accordionOpen,
  setAccordionOpen,
  bonusReportData,
  loading
}) => {

  return (
    <>
        <Row
          className="mt-4 align-items-center dashboard-accordion-header"
          onClick={() => setAccordionOpen(!accordionOpen)}
          style={{ cursor: "pointer" }}
        >
          <Col>
            <div className="d-flex align-items-center" style={{ gap: "10px" }}>
              <h5 className="accordian-heading">
                <span>Bonus Data</span>

                <span>
                  {accordionOpen ? (
                    <FontAwesomeIcon icon={faChevronDown} />
                  ) : (
                    <FontAwesomeIcon icon={faChevronRight} />
                  )}{" "}
                </span>
              </h5>
            </div>
          </Col>
          <Col></Col>
        </Row>

        <Accordion activeKey={accordionOpen ? "0" : ""}>
          <Accordion.Item eventKey="0">
            <Accordion.Body>
              <div className="table-responsive dashboard-table">
                <Table size="sm" className="text-center dashboard-data-table">
                  <thead>
                    <tr>
                      {bonusReportData && Object.keys(bonusReportData)?.length > 0 && (
                        <th className="text-left dashboard-data-table__param">Bonus Type</th>
                      )}
                      {bonusReportData &&
                        Object.keys(bonusReportData?.[Object.keys(bonusReportData)[0]] || {})?.map((reportKey, idx) => (
                          <th key={idx}>{reportKey.replace(/_/g, ' ')}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="text-center">
                          <InlineLoader />
                        </td>
                      </tr>
                    ) : bonusReportData && Object.keys(bonusReportData).length > 0 ? (
                      Object.keys(bonusReportData)?.map((bonusTypeKey, idx) => (
                        <tr key={idx}>
                          <td className="text-left dashboard-data-table__param text-capitalize">
                            {bonusTypeKey.replace(/([a-z])([A-Z])/g, '$1 $2')}
                          </td>
                          {Object.keys(bonusReportData[bonusTypeKey])?.map((reportKey, rIdx) => (
                            <td key={rIdx}>
                              {formatPriceWithCommas(bonusReportData[bonusTypeKey][reportKey]?.scBonus ?? "-")}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={10} className="text-danger text-center">
                          No data Found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
    </>
  );
};
export default BonusTable;
