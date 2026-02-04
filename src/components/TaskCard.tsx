import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import StarRounded from "@mui/icons-material/StarRounded";
import IconButton from "@mui/material/IconButton";
import { TimTask } from "@/types/tim";
import { format } from "date-fns";

interface TaskCardProps {
  task: TimTask;
  onToggleStar?: (id: string) => void;
}

export default function TaskCard({ task, onToggleStar }: TaskCardProps) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
          <Stack spacing={0.5}>
            <Typography variant="subtitle1">{task.title}</Typography>
            {task.description ? (
              <Typography variant="body2" color="text.secondary">
                {task.description}
              </Typography>
            ) : null}
          </Stack>
          {onToggleStar ? (
            <IconButton
              onClick={() => onToggleStar(task.id)}
              color={task.isStarred ? "warning" : "default"}
            >
              <StarRounded />
            </IconButton>
          ) : null}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Chip label={format(new Date(task.startDate), "MM.dd EEE")} />
          {task.isStarred ? <Chip label="최우선" color="warning" /> : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
