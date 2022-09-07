import { Link } from "@mui/material";
import { Stack } from "@mui/system";

export const GithubLink = (props: { url: string }) => {
  return (
    <Stack spacing={1} direction="row" alignItems={"baseline"}>
      <Link style={{ fontSize: 10 }} noWrap href={props.url}>
        {props.url}
      </Link>
    </Stack>
  );
};
