import { Row, Table, Accordion, Col } from '@themesberg/react-bootstrap';
import { totalTablesList, tableData } from '../constants';
import { InlineLoader } from '../../../components/Preloader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { formatPriceWithCommas } from '../../../utils/helper';

const EconomyTable = ({ accordionOpen, setAccordionOpen, t, economyDataV2,
  economyLoadingV2,
  // economyRefetchV2
}) => {

  return (
    <>
      <Row className="mt-4 align-items-center dashboard-accordion-header" onClick={() => setAccordionOpen(!accordionOpen)} style={{ cursor: 'pointer' }}>
        <Col className='col-12'>
          <div className="d-flex align-items-center" style={{ gap: "10px" }}>
            <h5 className='accordian-heading'>
              <span>{t(`headers.coinEcoDataKeys`)} {t('headers.data')}</span>
              <span>{accordionOpen ? <FontAwesomeIcon icon={faChevronDown} /> : <FontAwesomeIcon icon={faChevronRight} />} </span>
            </h5>
          </div>
        </Col>
      </Row>
      <Accordion activeKey={accordionOpen ? '0' : ''}>
        <Accordion.Item eventKey="0">
          <Accordion.Body>
            <div className='table-responsive dashboard-table'>
              <Table size='sm' className='text-center dashboard-data-table'>
                <thead>
                  <tr>
                    <th className='text-left dashboard-data-table__param'>
                      {t('table.parameters')}
                    </th>
                    <th>{t('table.today')}</th>
                    <th>{t('table.yesterday')}</th>
                    <th>{t('table.monthToDate')}</th>
                    <th>{t('table.lastMonth')}</th>
                    <th>{t('table.tillDate')}</th>
                    <th>{t('table.selectedDate')}</th>
                  </tr>
                </thead>

                {<tbody>
                  {economyLoadingV2 ? (
                    <tr><td colSpan={10}><InlineLoader /></td></tr>
                  ) : economyDataV2 && Object.keys(economyDataV2)?.length ? (
                    Object.keys(economyDataV2)?.map((data, i) => {
                      return (
                        Object.keys(totalTablesList['coinEcoDataKeys']).includes(data) && (
                          <tr key={i}>
                            <td className='text-left dashboard-data-table__param'>
                              {t(totalTablesList['coinEcoDataKeys'][data])}
                            </td>
                            {tableData?.map((ele) => (
                              <td key={ele}>{formatPriceWithCommas(economyDataV2?.[data]?.[ele] || 0)}</td>
                            ))}
                          </tr>
                        )
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={10} className='text-center text-danger'>
                        No Data Found
                      </td>
                    </tr>
                  )}
                </tbody>}
              </Table>
            </div>
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>
    </>
  );
};
export default EconomyTable;
