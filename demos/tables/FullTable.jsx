/* eslint-disable no-console, no-alert */
import React from 'react';

import findIndex from 'lodash/findIndex';
import orderBy from 'lodash/orderBy';

import {
  Table, Search, editors, sort, cells, formatters,
} from '../../src';

import {
  CustomFooter, ColumnFilters, EditCell, Modal, Paginator, PrimaryControls,
} from '../components';
import countries from '../data/countries';
import {
  generateData, paginate, augmentWithTitles, getFieldGenerators, find,
} from '../common';

const countryValues = countries.map((c) => c.value);
const properties = augmentWithTitles({
  name: {
    type: 'string',
  },
  position: {
    type: 'string',
  },
  salary: {
    type: 'number',
  },
  country: {
    type: 'string',
    enum: countryValues,
    enumNames: countries.map((c) => c.name),
  },
  active: {
    type: 'boolean',
  },
});
const data = generateData({
  amount: 100,
  fieldGenerators: getFieldGenerators(countryValues),
  properties,
});
const countryFormatter = country => find(countries, 'value', country).name;
const sorter = sort.byColumns; // sort.byColumn would work too

class FullTable extends React.Component {
  constructor(props) {
    super(props);

    const highlighter = column => formatters.highlight(value => {
      const { filter } = this.state.search;

      return Search.matches(
        column,
        value,
        filter[Object.keys(filter).pop()]
      );
    });
    const editable = cells.edit.bind(
      this,
      'editedCell',
      (value, { id }, property) => {
        const idx = findIndex(this.state.data, { id });

        this.state.data[idx][property] = value;

        this.setState({ data });
      }
    );
    const sortable = cells.sort.bind(
      null,
      () => this.state.sortingColumns || [],
      column => {
        this.setState({
          sortingColumns: sorter(
            this.state.sortingColumns, column
          ),
        });
      }
    );

    this.state = {
      editedCell: null,
      data,
      formatters: {
        country: countryFormatter,
      },
      search: {
        filter: {},
      },
      sortingColumns: null, // reference to sorting column
      columns: [
        {
          property: 'name',
          header: sortable(
            <div>
              <input
                type="checkbox"
                onClick={() => console.log('clicked')}
                style={{ width: '20px' }}
              />
              <span>Name</span>
            </div>
          ),
          cell: editable({
            editor: editors.input(),
            formatter: highlighter('name'),
          }),
        },
        {
          property: 'position',
          header: sortable('Position'),
          cell: ({ value }) => value,
        },
        {
          property: 'country',
          header: sortable('Country'),
          search: countryFormatter,
          cell: editable({
            editor: editors.dropdown(countries),
            formatter: v => highlighter('country')(countryFormatter(v)),
          }),
        },
        {
          property: 'salary',
          header: sortable('Salary'),
          cell: ({ value }) => (
            <span onDoubleClick={() => alert(`salary is ${value}`)}>
              {highlighter('salary')(value)}
            </span>
          ),
        },
        {
          property: 'active',
          header: sortable('Active'),
          cell: editable({
            editor: editors.boolean(),
            formatter: value => value && <span>&#10003;</span>,
          }),
        },
        {
          cell: ({ cellData }) => {
            const edit = () => {
              this.setState({
                modal: {
                  show: true,
                  title: 'Edit',
                  content: <EditCell
                    onSubmit={(formData) => {
                      this.state.data[cellData.id] = formData;

                      this.setState({
                        modal: { ...this.state.modal, show: false },
                        data: this.state.data,
                      });
                    }}
                    onCancel={() => {
                      this.setState({
                        modal: {
                          ...this.state.modal,
                          ...{
                            show: false,
                          },
                        },
                      });
                    }}
                    formData={cellData}
                    properties={properties}
                  />,
                },
              });
            };

            const remove = () => {
              // this could go through flux etc.
              this.state.data.splice(cellData.id, 1);

              this.setState({
                data: this.state.data,
              });
            };

            return (
              <div>
                <span
                  className="edit"
                  onClick={() => edit()} style={{ cursor: 'pointer' }}
                >
                  &#8665;
                </span>
                <span
                  className="remove"
                  onClick={() => remove()} style={{ cursor: 'pointer' }}
                >
                  &#10007;
                </span>
              </div>
            );
          },
        },
      ],
      modal: {
        show: false,
        title: 'title',
        content: 'content',
      },
      pagination: {
        page: 1,
        perPage: 10,
      },
    };

    this.onModalClose = this.onModalClose.bind(this);
    this.onSearch = this.onSearch.bind(this);
    this.onSelect = this.onSelect.bind(this);
    this.onPerPage = this.onPerPage.bind(this);
  }
  render() {
    const { columns, modal, pagination, sortingColumns } = this.state;
    let d = this.state.data;

    if (this.state.search.filter) {
      d = Search.search(
        d,
        columns,
        this.state.search.filter
      );
    }

    d = sorter.sort(d, sortingColumns, orderBy);

    const paginated = paginate(d, pagination);
    const pages = Math.ceil(data.length / Math.max(
      isNaN(pagination.perPage) ? 1 : pagination.perPage, 1)
    );

    return (
      <div>
        <PrimaryControls
          className="controls"
          perPage={pagination.perPage}
          columns={columns}
          data={this.state.data}
          onPerPage={this.onPerPage}
          onSearch={this.onSearch}
        />

        <Table
          className="pure-table pure-table-striped"
          columns={columns}
          data={paginated.data}
        >
          <Table.Header>
            <ColumnFilters columns={columns} onChange={this.onSearch} />
          </Table.Header>

          <Table.Body
            rowKey="id"
            row={(row, rowIndex) => ({
              className: rowIndex % 2 ? 'odd-row' : 'even-row',
              onClick: () => console.log('clicked row', row),
            })}
          />

          <CustomFooter />
        </Table>

        <div className="controls">
          <Paginator pagination={pagination} pages={pages} onSelect={this.onSelect} />
        </div>

        <Modal show={modal.show} title={modal.title} onCloseClicked={this.onModalClose}>
          {modal.content}
        </Modal>
      </div>
    );
  }
  onModalClose() {
    this.setState({
      modal: {
        ...this.state.modal,
        ...{
          show: false,
        },
      },
    });
  }
  onSearch(filter) {
    this.setState({
      editedCell: null, // reset edits
      search: { filter },
    });
  }
  onSelect(page) {
    const pages = Math.ceil(
      this.state.data.length / this.state.pagination.perPage
    );

    this.setState({
      pagination: {
        ...this.state.pagination,
        page: Math.min(Math.max(page, 1), pages),
      },
    });
  }
  onPerPage(value) {
    this.setState({
      pagination: {
        ...this.state.pagination,
        perPage: parseInt(value, 10),
      },
    });
  }
}

export default FullTable;