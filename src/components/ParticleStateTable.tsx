import Editor from "@monaco-editor/react";
import {
  Box,
  Card,
  Container,
  createTheme,
  CssBaseline,
  Paper,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ThemeProvider,
  Tooltip,
  Typography,
} from "@mui/material";
import { Stack } from "@mui/system";

const formatPoint = (value: number) => {
  if (value < 0) {
    return value.toFixed(3);
  }
  return "+" + value.toFixed(3);
};

const formatProperty = (value: number) => {
  return value.toFixed(3);
};

export const ParticleStateTable = (props: {
  particleState: [Float32Array, Float32Array, Float32Array][];
}) => {
  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} size="small" aria-label="a dense table">
        <TableHead>
          <TableRow>
            <TableCell>pos</TableCell>
            <TableCell>velocity</TableCell>
            <TableCell>color</TableCell>
            <TableCell>gravity</TableCell>
            <TableCell>size</TableCell>
            <TableCell>friction</TableCell>
            <TableCell>unused</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {props.particleState.map((state, i) => (
            <TableRow key={i}>
              {state.map((row, i) => {
                const cells = [];
                if (i === 0) {
                  cells.push(
                    <TableCell>
                      <Stack direction="column">
                        <Typography>{formatPoint(row[0])}</Typography>
                        <Typography>{formatPoint(row[1])}</Typography>
                      </Stack>
                    </TableCell>
                  );
                  cells.push(
                    <TableCell>
                      <Stack direction="column">
                        <Typography>{formatPoint(row[2])}</Typography>
                        <Typography>{formatPoint(row[3])}</Typography>
                      </Stack>
                    </TableCell>
                  );
                } else if (i === 1) {
                  cells.push(
                    <TableCell>
                      <Stack direction="row" alignItems="center">
                        <Tooltip
                          title={
                            formatProperty(row[0]) +
                            " " +
                            formatProperty(row[1]) +
                            " " +
                            formatProperty(row[2]) +
                            " " +
                            formatProperty(row[3])
                          }
                        >
                          <div
                            style={{
                              marginLeft: "0.5em",
                              width: 10,
                              height: 10,
                              backgroundColor: `rgba(${row[0] * 255},${
                                row[1] * 255
                              },${row[2] * 255},${row[3]})`,
                            }}
                          ></div>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  );
                } else if (i === 2) {
                  cells.push(<TableCell>{formatProperty(row[0])}</TableCell>);
                  cells.push(<TableCell>{formatProperty(row[1])}</TableCell>);
                  cells.push(<TableCell>{formatProperty(row[2])}</TableCell>);
                  cells.push(<TableCell>{formatProperty(row[3])}</TableCell>);
                }
                return cells;
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
