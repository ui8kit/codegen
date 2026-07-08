import {
  Badge,
  Block,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Container,
  Grid,
  Group,
  Link,
  Stack,
  Text,
  Title,
} from "@ui";
import welcome from "../../data/welcome.json";

export type WelcomeViewProps = {
  runtime: string;
};

export function WelcomeView({ runtime }: WelcomeViewProps) {
  return (
    <Block tag="main" className="min-h-screen bg-muted/30 text-foreground">
      <Container className="mx-auto max-w-4xl px-4 py-16">
        <Stack className="gap-8">
          <Stack className="items-center gap-4 text-center">
            <Badge variant="outline" className="text-xs uppercase tracking-wide">
              {runtime}
            </Badge>
            <Title as={1} className="text-3xl font-bold tracking-tight">
              {welcome.title}
            </Title>
            <Text className="max-w-2xl text-muted-foreground">{welcome.subtitle}</Text>
          </Stack>

          <Card variant="default">
            <CardHeader>
              <CardTitle>Generated primitives</CardTitle>
            </CardHeader>
            <CardContent>
              <Stack className="gap-4">
                <Group className="flex-wrap gap-2">
                  <Button variant="default" size="sm">
                    Default
                  </Button>
                  <Button variant="secondary" size="sm">
                    Secondary
                  </Button>
                  <Button variant="outline" size="sm">
                    Outline
                  </Button>
                  <Button variant="ghost" size="sm">
                    Ghost
                  </Button>
                  <Button variant="destructive" size="sm">
                    Destructive
                  </Button>
                </Group>
                <Group className="flex-wrap gap-2">
                  <Badge variant="default">Badge</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                </Group>
              </Stack>
            </CardContent>
          </Card>

          <Grid cols="1-3" className="gap-4">
            {welcome.features.map((feature) => (
              <Card key={feature.title} variant="muted">
                <CardHeader>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Text className="text-sm text-muted-foreground">{feature.description}</Text>
                </CardContent>
              </Card>
            ))}
          </Grid>

          <Box className="rounded-lg border border-border bg-card p-4">
            <Stack className="gap-3">
              <Text className="text-sm font-medium">Preview other runtimes</Text>
              <Group className="flex-wrap gap-3">
                {welcome.runtimes.map((rt) => (
                  <Link key={rt.id} href={`http://127.0.0.1:${rt.port}`} variant="default">
                    {rt.label}
                  </Link>
                ))}
              </Group>
            </Stack>
          </Box>

          <Text className="text-center text-sm text-muted-foreground">
            Same shadcn tokens · generated ui/ primitives · @ui8kit/codegen
          </Text>
        </Stack>
      </Container>
    </Block>
  );
}
