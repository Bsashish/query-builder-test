import Head from "next/head";
import { useEffect, useState } from "react";
import QueryBuilder, { formatQuery } from "react-querybuilder";
import {
  Autocomplete,
  Button,
  Checkbox,
  FormControlLabel,
  Input,
  TextField,
  Typography,
} from "@mui/material";
import "react-querybuilder/dist/query-builder.css";

const types = [
  {
    label: "SELECT",
    value: "SELECT",
  },
  {
    label: "INSERT",
    value: "INSERT",
  },
];

const initialQuery = {
  combinator: "and",
  rules: [],
};

const listOfJoin = [
  { label: "inner", value: "inner join" },
  { label: "full", value: "full join" },
  { label: "left", value: "left join" },
  { label: "right", value: "right join" },
];

const listOfAggrigation = [
  { label: "Sum", value: "Sum" },
  { label: "Min", value: "Min" },
  { label: "Max", value: "Max" },
  { label: "Avg", value: "Avg" },
  { label: "Count", value: "Count" },
];

const initialData = {
  tableName: "",
  tables: [],
  selectFields: [],
  fields: [],
  isJoin: false,
  joiningValue: "",
  currentOnValue: "",
  prevOnValue: "",
};

const initialAggrigateData = { key: "", value: [], id: 0 };

export default function Home() {
  const [type, setType] = useState("");

  const [tableNames, setTableNames] = useState([]);
  const [tableList, setTableList] = useState({});

  const [fieldValue, setFieldValue] = useState(null);

  const [result, setResult] = useState([]);
  const [query, setQuery] = useState(initialQuery);

  const [isAggrigate, setIsAggrigate] = useState(false);
  const [aggrigtion, setAggrigation] = useState([initialAggrigateData]);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    try {
      let finalQuery = "";
      switch (type?.value) {
        case "SELECT":
          if (isAggrigate) {
            finalQuery = `Select`;
            finalQuery += aggrigtion
              .map(({ key, value }) =>
                value.map(
                  (item) =>
                    ` ${item.value}(${key.value}) as ${item.value}__${key.value}`
                )
              )
              .flat()
              .join(",");
            finalQuery += ` from ${tableList[0]?.tableName.value}`;
          } else {
            let field = Object.entries(tableList).map(
              ([id, { selectFields }]) =>
                selectFields
                  .map(
                    ({ value }) => `${tableList[id]?.tableName.value}.${value}`
                  )
                  .join(",")
            );
            finalQuery = `Select ${field} from ${tableList[0]?.tableName.value}`;
          }

          Object.entries(tableList).map(
            ([
              id,
              { tableName, joiningValue, currentOnValue, prevOnValue },
            ]) => {
              if (id !== Object.keys(tableList).length) {
                if (joiningValue) {
                  finalQuery += ` ${joiningValue.value} `;
                }
              }
              if (id > 0) {
                finalQuery += `${tableName.value}  on  ${
                  tableList[id - 1]?.tableName.value
                }.${prevOnValue.value} = ${tableName.value}.${
                  currentOnValue.value
                }`;
              }
            }
          );

          if (query.rules.length) {
            finalQuery += ` where ${formatQuery(query, "sql")}`;
          }
          break;
        case "INSERT":
          let updatedFieldValue = Object.entries(fieldValue).filter(
            ([key, value]) => !!value
          );

          finalQuery = `INSERT into ${
            tableList[0].tableName.value
          } ( ${updatedFieldValue
            .map(([key]) => key)
            .join(",")} ) values ( ${updatedFieldValue
            .map(([_, value]) => `'${value}'`)
            .join(",")} )`;
          break;
      }
      let res = await fetch("/api/server", {
        method: "POST",
        body: JSON.stringify({ query: finalQuery }),
      });
      res = await res.json();
      res?.error
        ? (setError(res.error), setResult([]))
        : (setResult(res), setError(""));
    } catch (error) {
      console.log("err", error);
    }
  };

  const getTableNames = async () => {
    try {
      let res = await fetch("/api/server");
      res = await res.json();
      res = res.map(({ table_fullname }) => {
        let updatedValue = table_fullname.split(".")[1];
        return {
          label: updatedValue,
          value: updatedValue,
        };
      });
      return res;
    } catch (err) {
      console.log("err", err);
    }
  };

  const createDefultTable = async () => {
    try {
      let res = await fetch("api/server", {
        method: "POST",
        body: JSON.stringify({
          query: `CREATE TABLE person ( id integer PRIMARY KEY, first_name varchar(40) NOT NULL, last_name varchar(40) NOT NULL, gender varchar(40) NOT NULL )`,
        }),
      });
      res = await res.json();
      console.log("===", res);
    } catch (err) {
      console.log("err", err);
    }
  };

  const getList = async (tableName) => {
    try {
      let findQuery = `select * from ${tableName.value}`;
      let res = await fetch("/api/server", {
        method: "POST",
        body: JSON.stringify({ query: findQuery }),
      });
      res = await res.json();
      let formattedFields = Object.keys(res[0]).map((item) => ({
        label: item,
        value: item,
      }));
      return formattedFields;
    } catch (err) {
      console.log("err", err);
    }
  };

  let aggrigationHandleChange = (i, value, name) => {
    let currentValues = aggrigtion.find(({ id }) => id === i);
    let newFormValues = [
      { ...currentValues, [name]: value },
      ...aggrigtion.filter(({ id }) => id !== i),
    ];
    newFormValues = newFormValues.sort((a, b) => a.id - b.id);
    setAggrigation(newFormValues);
  };

  let addFormFields = () => {
    setAggrigation([
      ...aggrigtion,
      { ...initialAggrigateData, id: aggrigtion.length },
    ]);
  };

  let removeFormFields = (i) => {
    let newFormValues = aggrigtion.filter(({ id }) => id !== i);
    setAggrigation(newFormValues);
  };

  useEffect(() => {
    (async () => {
      let tables = await getTableNames();
      if (!tables.length) {
        await createDefultTable();
        tables = await getTableNames();
        setTableNames(tables);
      } else {
        setTableNames(tables);
      }
    })();
  }, []);

  useEffect(() => {
    setTableList({ 0: { ...initialData, tables: tableNames } });
  }, [tableNames]);

  useEffect(() => {
    if (tableList?.[0]?.fields) {
      setFieldValue(
        Object.fromEntries(
          tableList?.[0]?.fields.slice(1).map(({ value }) => [value, ""])
        )
      );
    }
  }, [tableList?.[0]?.fields]);

  const handleChange = (value, name) => {
    setFieldValue((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <Head>
        <title>Query Builder</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <Autocomplete
          size="small"
          value={type}
          onChange={(event, newValue) => {
            setType(newValue);
            setTableList((prev) => {
              return { 0: { ...initialData, tables: prev[0].tables } };
            });
            setResult([]);
          }}
          id="query-type"
          options={types}
          sx={{ width: 300, m: 2 }}
          renderInput={(params) => <TextField {...params} label="Query Type" />}
        />
        <div className="flex">
          {Object.entries(tableList).map(
            (
              [
                id,
                {
                  tableName,
                  tables,
                  selectFields,
                  fields,
                  isJoin,
                  joiningValue,
                  currentOnValue,
                  prevOnValue,
                },
              ],
              index
            ) => {
              return (
                <div key={id} className="flex-col">
                  <Autocomplete
                    value={tableName}
                    size="small"
                    onChange={async (event, newValue) => {
                      if (newValue) {
                        let tempList = await getList(newValue);
                        setTableList((prev) => ({
                          ...prev,
                          [id]: {
                            ...prev[id],
                            tableName: newValue,
                            fields: [{ label: "All", value: "*" }, ...tempList],
                            selectFields: [],
                          },
                        }));
                        setResult([]);
                      }
                    }}
                    id="controllable-states-demo"
                    options={tables}
                    sx={{ width: 300, m: 2 }}
                    renderInput={(params) => (
                      <TextField {...params} label="Table Name" />
                    )}
                  />
                  {type?.value === "SELECT" && (
                    <>
                      <Autocomplete
                        size="small"
                        multiple
                        value={selectFields}
                        onChange={(event, newValue) => {
                          let changedValue = newValue.some(
                            ({ value }) => value === "*"
                          )
                            ? [{ label: "All", value: "*" }]
                            : newValue;
                          setTableList((prev) => ({
                            ...prev,
                            [id]: { ...prev[id], selectFields: changedValue },
                          }));
                        }}
                        id="controllable-states-demo"
                        options={fields}
                        getOptionDisabled={({ value }) =>
                          selectFields.some(({ value }) => value === "*")
                        }
                        sx={{ width: 300, m: 2 }}
                        renderInput={(params) => (
                          <TextField {...params} label="Field Names" />
                        )}
                        disabled={!tableName || isAggrigate}
                      />
                      <FormControlLabel
                        value="Apply Join"
                        sx={{ m: 2 }}
                        control={
                          <Checkbox
                            value={isJoin}
                            disabled={
                              !selectFields?.length ||
                              tables?.length - 1 === id ||
                              isAggrigate
                            }
                            onChange={({ target: { checked } }) => {
                              if (checked) {
                                setTableList((prev) => ({
                                  ...prev,
                                  [id]: { ...prev[id], isJoin: checked },
                                  [+id + 1]: {
                                    ...initialData,
                                    tables: tables.filter(
                                      ({ value }) =>
                                        tableList[id]?.tableName?.value !==
                                        value
                                    ),
                                  },
                                }));
                              } else {
                                setTableList((prev) => ({
                                  ...Object.fromEntries(
                                    Object.entries(prev).filter(
                                      ([currId]) => currId < id
                                    )
                                  ),
                                  [id]: { ...prev[id], isJoin: checked },
                                }));
                              }
                            }}
                          />
                        }
                        label="Apply Join"
                        labelPlacement="left"
                      />

                      <Autocomplete
                        value={joiningValue}
                        size="small"
                        onChange={(event, newValue) => {
                          setTableList((prev) => ({
                            ...prev,
                            [id]: { ...prev[id], joiningValue: newValue },
                          }));
                        }}
                        id="controllable-states-demo"
                        options={listOfJoin}
                        sx={{ width: 300, m: 2 }}
                        renderInput={(params) => (
                          <TextField {...params} label="Type of Join" />
                        )}
                        disabled={!isJoin}
                      />
                      {index > 0 && tableList[index - 1]?.isJoin && (
                        <>
                          <Autocomplete
                            size="small"
                            value={prevOnValue}
                            onChange={(event, newValue) => {
                              setTableList((prev) => ({
                                ...prev,
                                [id]: { ...prev[id], prevOnValue: newValue },
                              }));
                            }}
                            id="controllable-states-demo"
                            options={tableList[index - 1].fields}
                            sx={{ width: 300, m: 2 }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label={`${
                                  tableList[index - 1].tableName.value
                                } Field`}
                              />
                            )}
                            disabled={
                              !tableList[index - 1].isJoin ||
                              !tableList[index - 1].joiningValue
                            }
                          />
                          <Autocomplete
                            size="small"
                            value={currentOnValue}
                            onChange={(event, newValue) => {
                              setTableList((prev) => ({
                                ...prev,
                                [id]: {
                                  ...prev[id],
                                  currentOnValue: newValue,
                                },
                              }));
                            }}
                            id="controllable-states-demo"
                            options={fields || []}
                            sx={{ width: 300, m: 2 }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label={`${
                                  tableName.value ? tableName.value : ""
                                } Field`}
                              />
                            )}
                            disabled={
                              !tableList[index - 1].isJoin ||
                              !tableList[index - 1].joiningValue
                            }
                          />
                        </>
                      )}
                    </>
                  )}
                </div>
              );
            }
          )}
        </div>
        {type?.value === "SELECT" && tableList[0]?.tableName && (
          <>
            <FormControlLabel
              value="Apply Aggrigate"
              control={
                <Checkbox
                  value={isAggrigate}
                  disabled={tableList[0]?.isJoin}
                  onChange={({ target: { checked } }) => {
                    setIsAggrigate(checked);
                  }}
                />
              }
              label="Apply Aggrigate"
              labelPlacement="left"
              sx={{ m: 2 }}
            />
            {isAggrigate && (
              <Button
                variant="contained"
                onClick={() => addFormFields()}
                sx={{ m: 2 }}
              >
                Add
              </Button>
            )}
            {isAggrigate && (
              <div>
                {aggrigtion.map(({ key, value, id }) => (
                  <div key={id} className="flex-col">
                    <Autocomplete
                      value={key}
                      size="small"
                      onChange={(event, newValue) => {
                        aggrigationHandleChange(id, newValue, "key");
                      }}
                      id="controllable-states-demo"
                      options={tableList[0].fields}
                      sx={{ width: 300, m: 2 }}
                      renderInput={(params) => (
                        <TextField {...params} label="Field name" />
                      )}
                      // disabled={!tableName}
                    />
                    <Autocomplete
                      multiple
                      size="small"
                      name="value"
                      value={value}
                      onChange={(event, newValue) => {
                        aggrigationHandleChange(id, newValue, "value");
                      }}
                      id="controllable-states-demo"
                      options={listOfAggrigation}
                      sx={{ width: 300, m: 2 }}
                      renderInput={(params) => (
                        <TextField
                          name="value"
                          {...params}
                          label="Aggrigations"
                        />
                      )}
                      // disabled={!tableName}
                    />
                    <Button
                      variant="contained"
                      onClick={() => removeFormFields(id)}
                      sx={{ m: 2 }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tableList[0]?.tableName && (
          <>
            {type?.value === "SELECT" && (
              <QueryBuilder
                fields={Object.entries(tableList)
                  .map(([id, { tableName, fields }]) => {
                    let temp = fields
                      .filter(({ value }) => value !== "*")
                      .map(({ value }) => ({
                        name: `${tableName.value}.${value}`,
                        label: `${tableName.value}.${value}`,
                      }));
                    return temp;
                  })
                  .flat()}
                query={query}
                onQueryChange={(e) => {
                  setQuery(e);
                }}
              />
            )}
            {type?.value === "INSERT" && (
              <table>
                <tr>
                  <td>KEY</td>
                  <td>VALUE</td>
                </tr>
                {tableList[0]?.fields?.slice(1).map(({ label }) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td>
                      <Input
                        size="small"
                        value={fieldValue[label]}
                        onChange={({ target: { value } }) =>
                          handleChange(value, label)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </table>
            )}
            {/* {type?.value === "UPDATE" && (
              <table>
                <tr>
                  <td>KEY</td>
                  <td>VALUE</td>
                  <td>CONDITION</td>
                  <td>CONDITION VALUE</td>
                </tr>
                {tableList[0]?.fields?.map(({ name }) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td>
                      <Input
                        size="small"
                        value={fieldValue[name]}
                        onChange={({ target: { value } }) =>
                          handleChange(value, name)
                        }
                      />
                    </td>
                    <td>
                      <Autocomplete
                        size="small"
                        value={fieldValue[name]}
                        onChange={(event, newValue) => {
                          setType(newValue);
                        }}
                        id="query-type"
                        options={types}
                        sx={{ width: 300 }}
                        renderInput={(params) => (
                          <TextField {...params} label="Condition" />
                        )}
                      />
                    </td>
                    <td>
                      <Input />
                    </td>
                  </tr>
                ))}
              </table>
            )} */}
          </>
        )}
        <Button
          variant="contained"
          sx={{ m: 2 }}
          onClick={handleSubmit}
          disabled={!type?.value}
        >
          Submit
        </Button>
        <div>
          {!!result.length && (
            <table className="table">
              <tr>
                {Object.keys(result[0]).map((key) => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
              {result.map((item) => (
                <tr key={item.id}>
                  {Object.values(item).map((value, index) => (
                    <td key={index}>{value}</td>
                  ))}
                </tr>
              ))}
            </table>
          )}
        </div>
        <Typography color="error" margin={2}>
          {error}
        </Typography>
      </main>
    </>
  );
}
