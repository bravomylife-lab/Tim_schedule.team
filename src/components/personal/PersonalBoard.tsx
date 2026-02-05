import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import SectionHeader from "@/components/SectionHeader";
import { useTaskContext } from "@/contexts/TaskContext";

const personalSections = [
  {
    title: "금전/대출",
    items: ["대출 상환 일정", "카드/세금 결제"],
  },
  {
    title: "취미",
    items: ["레슨 예약", "영감 노트 정리"],
  },
  {
    title: "독서",
    items: ["주간 독서 기록", "추천 서평 정리"],
  },
  {
    title: "운동",
    items: ["러닝 5km", "근력 루틴"],
  },
];

export default function PersonalBoard() {
  const { tasks } = useTaskContext();
  const personalTasks = tasks.filter((task) => task.category === "PERSONAL");

  return (
    <Box>
      <SectionHeader title="개인 스케줄" subtitle="개인 업무와 자기 관리 루틴을 분리 관리합니다" />
      <Alert severity="info" sx={{ mb: 3 }}>
        주식 관련 일정은 전용 페이지에서 통합 관리됩니다.
      </Alert>
      <Grid container spacing={3}>
        {personalSections.map((section) => (
          <Grid item xs={12} md={6} key={section.title}>
            <Card>
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>
                  {section.title}
                </Typography>
                <List dense>
                  {section.items.map((item) => (
                    <ListItem key={item} disablePadding>
                      <ListItemText primary={item} />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        ))}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                오늘의 개인 일정
              </Typography>
              <List dense>
                {personalTasks.map((task) => (
                  <ListItem key={task.id} disablePadding>
                    <ListItemText primary={task.title} secondary={task.description} />
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
