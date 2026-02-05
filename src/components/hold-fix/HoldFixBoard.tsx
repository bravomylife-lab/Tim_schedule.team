"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import SectionHeader from "@/components/SectionHeader";
import { useTaskContext } from "@/contexts/TaskContext";

export default function HoldFixBoard() {
  const { tasks } = useTaskContext();
  const items = tasks.filter((task) => task.category === "HOLD_FIX");
  const holdItems = items.filter((task) => task.holdFixDetails?.type === "HOLD");
  const fixReleaseItems = items.filter(
    (task) => task.holdFixDetails?.type === "FIX" || task.holdFixDetails?.type === "RELEASE"
  );

  return (
    <Box>
      <SectionHeader
        title="Hold / Fix"
        subtitle="홀드 및 픽스된 데모 정보와 지분/퍼블리싱 정보를 빠르게 확인합니다"
      />
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Hold
          </Typography>
          <Grid container spacing={3}>
            {holdItems.map((task) => (
              <Grid item xs={12} md={6} key={task.id}>
                <Card>
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1">
                          {task.holdFixDetails?.demoName}
                        </Typography>
                        <Chip label="HOLD" size="small" />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Writers: {task.holdFixDetails?.writers.join(", ")}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Splits: {" "}
                        {task.holdFixDetails?.splits
                          ? Object.entries(task.holdFixDetails.splits)
                              .map(([name, value]) => `${name} ${value}%`)
                              .join(" · ")
                          : "-"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Publishing: {task.holdFixDetails?.publishingInfo}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Contact: {task.holdFixDetails?.email}
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            label="홀드 요청 날짜"
                            size="small"
                            defaultValue={task.holdFixDetails?.holdRequestedDate}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            label="홀드 기간"
                            size="small"
                            defaultValue={task.holdFixDetails?.holdPeriod}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField
                            label="담당자"
                            size="small"
                            defaultValue={task.holdFixDetails?.manager}
                            fullWidth
                          />
                        </Grid>
                      </Grid>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle1" sx={{ mb: 2, mt: 1 }}>
            Fix & Release
          </Typography>
          <Grid container spacing={3}>
            {fixReleaseItems.map((task) => (
              <Grid item xs={12} md={6} key={task.id}>
                <Card
                  sx={{
                    border:
                      task.holdFixDetails?.type === "FIX"
                        ? "2px solid #F4B400"
                        : "2px solid rgba(53, 89, 227, 0.2)",
                  }}
                >
                  <CardContent>
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1">
                          {task.holdFixDetails?.demoName}
                        </Typography>
                        <Chip
                          label={task.holdFixDetails?.type}
                          color={task.holdFixDetails?.type === "FIX" ? "warning" : "primary"}
                          size="small"
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Writers: {task.holdFixDetails?.writers.join(", ")}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Splits: {" "}
                        {task.holdFixDetails?.splits
                          ? Object.entries(task.holdFixDetails.splits)
                              .map(([name, value]) => `${name} ${value}%`)
                              .join(" · ")
                          : "-"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Publishing: {task.holdFixDetails?.publishingInfo}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Contact: {task.holdFixDetails?.email}
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="발매 날짜"
                            size="small"
                            defaultValue={task.holdFixDetails?.releaseDate}
                            fullWidth
                          />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField
                            label="Production Fee"
                            size="small"
                            defaultValue={task.holdFixDetails?.productionFee}
                            fullWidth
                          />
                        </Grid>
                      </Grid>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );
}
