<script lang="ts">
  import welcome from "../../data/welcome.json";
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
</script>

<Block tag="main" class="min-h-screen bg-muted/30 text-foreground">
  <Container class="mx-auto max-w-4xl px-4 py-16">
    <Stack class="gap-8">
      <Stack class="items-center gap-4 text-center">
        <Badge variant="outline" class="text-xs uppercase tracking-wide">Svelte 5</Badge>
        <Title as={1} class="text-3xl font-bold tracking-tight">{welcome.title}</Title>
        <Text class="max-w-2xl text-muted-foreground">{welcome.subtitle}</Text>
      </Stack>

      <Card variant="default">
        <CardHeader>
          <CardTitle>Generated primitives</CardTitle>
        </CardHeader>
        <CardContent>
          <Stack class="gap-4">
            <Group class="flex-wrap gap-2">
              <Button variant="default" size="sm">Default</Button>
              <Button variant="secondary" size="sm">Secondary</Button>
              <Button variant="outline" size="sm">Outline</Button>
              <Button variant="ghost" size="sm">Ghost</Button>
              <Button variant="destructive" size="sm">Destructive</Button>
            </Group>
            <Group class="flex-wrap gap-2">
              <Badge variant="default">Badge</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
            </Group>
          </Stack>
        </CardContent>
      </Card>

      <Grid cols="1-3" class="gap-4">
        {#each welcome.features as feature (feature.title)}
          <Card variant="muted">
            <CardHeader>
              <CardTitle>{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Text class="text-sm text-muted-foreground">{feature.description}</Text>
            </CardContent>
          </Card>
        {/each}
      </Grid>

      <Box class="rounded-lg border border-border bg-card p-4">
        <Stack class="gap-3">
          <Text class="text-sm font-medium">Preview other runtimes</Text>
          <Group class="flex-wrap gap-3">
            {#each welcome.runtimes as rt (rt.id)}
              <Link href="http://127.0.0.1:{rt.port}" variant="default">{rt.label}</Link>
            {/each}
          </Group>
        </Stack>
      </Box>

      <Text class="text-center text-sm text-muted-foreground">
        Same shadcn tokens · generated ui/ primitives · @ui8kit/codegen
      </Text>
    </Stack>
  </Container>
</Block>
