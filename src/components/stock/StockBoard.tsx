import { useMemo } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import SectionHeader from "@/components/SectionHeader";
import { useTaskContext } from "@/contexts/TaskContext";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  getDay,
} from "date-fns";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function StockBoard() {
  const { tasks } = useTaskContext();
  const stockTasks = tasks.filter((task) => task.category === "STOCK");

  const calendarDays = useMemo(() => {
    const today = new Date();
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    return eachDayOfInterval({ start, end });
  }, []);

  return (
    <Box>
      <SectionHeader
        title="주식 일정"
        subtitle="실적 발표, 주요 이슈, 뉴스 링크를 한눈에 확인합니다"
      />
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                이번 달 주요 일정
              </Typography>
              <Stack spacing={2}>
                {stockTasks.map((task) => (
                  <Card key={task.id} variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                    <Stack spacing={1}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle2">{task.title}</Typography>
                        <Chip label={task.stockDetails?.ticker} size="small" color="secondary" />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        일정: {format(parseISO(task.startDate), "MM.dd EEE")}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        메모: {task.stockDetails?.note}
                      </Typography>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={5}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                캘린더 뷰
              </Typography>
              <Box sx={{ p: 1 }}>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, mb: 1 }}>
                  {WEEKDAYS.map((day) => (
                    <Typography key={day} variant="caption" align="center" color="text.secondary">
                      {day}
                    </Typography>
                  ))}
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
                  {Array.from({ length: getDay(calendarDays[0]) }).map((_, i) => (
                    <Box key={`empty-${i}`} />
                  ))}

                  {calendarDays.map((date) => {
                    const hasEvent = stockTasks.some((task) =>
                      isSameDay(parseISO(task.startDate), date)
                    );

                    return (
                      <Box key={date.toISOString()} sx={{ display: "flex", justifyContent: "center" }}>
                        <Box
                          sx={{
                            height: 36,
                            width: 36,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "50%",
                            bgcolor: isToday(date) ? "primary.main" : "transparent",
                            color: isToday(date) ? "white" : "text.primary",
                            border: hasEvent && !isToday(date) ? "1px solid #3559E3" : "none",
                            position: "relative",
                          }}
                        >
                          <Typography variant="body2" fontWeight={isToday(date) ? 700 : 400}>
                            {format(date, "d")}
                          </Typography>
                          {hasEvent && (
                            <Box
                              sx={{
                                width: 4,
                                height: 4,
                                borderRadius: "50%",
                                bgcolor: isToday(date) ? "white" : "secondary.main",
                                position: "absolute",
                                bottom: 4,
                              }}
                            />
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                관련 뉴스
              </Typography>
              <List dense>
                {stockTasks.map((task) => (
                  <ListItem key={`${task.id}-news`} disablePadding sx={{ mb: 1 }}>
                    <ListItemText
                      primary={task.stockDetails?.relatedNewsTitle}
                      secondary={task.title}
                    />
                    <Button 
                      variant="outlined" 
                      size="small" 
                      href={task.stockDetails?.relatedNewsUrl || `https://www.google.com/search?q=${task.stockDetails?.ticker}+stock+news`}
                      target="_blank"
                      sx={{ minWidth: 80 }}
                    >
                      뉴스 보기
                    </Button>
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
